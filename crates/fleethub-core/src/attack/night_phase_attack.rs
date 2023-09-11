use crate::{
    member::BattleMemberRef,
    types::{
        AswPhase, AttackPowerModifier, Engagement, FormationParams, GearType, HistoricalParams,
        NightAttackStyle, NightAttackType, NightConditions, NightFleetConditions,
        NightPhaseAttackStyle, ProficiencyModifiers, ShipType,
    },
};

use super::{
    anti_pt_imp_modifiers::AntiPtImpAccuracyModifiers, AswAttackParams, Attack, AttackParams,
    AttackPowerParams, DefenseParams, HitRateParams,
};

const NIGHT_POWER_CAP: f64 = 360.0;
const NIGHT_ACCURACY_CONSTANT: f64 = 69.0;

pub struct NightPhaseAttackParams<'a> {
    pub style: NightPhaseAttackStyle,
    pub engagement: Engagement,
    pub attacker: &'a BattleMemberRef<'a>,
    pub target: &'a BattleMemberRef<'a>,
    pub formation_params: FormationParams,
    pub historical_params: HistoricalParams,
    pub night_conditions: &'a NightConditions,
}

impl NightPhaseAttackParams<'_> {
    pub fn calc_attack_params(&self) -> AttackParams {
        let attacker = self.attacker;
        let target = self.target;
        let engagement = self.engagement;
        let formation_params = self.formation_params;
        let historical_params = self.historical_params;
        let night_conditions = self.night_conditions;

        let attack_params = match self.style.clone() {
            NightPhaseAttackStyle::Night(style) => NightAttackParams {
                style,
                attacker,
                target,
                formation_params,
                historical_params,
                night_conditions,
            }
            .calc_attack_params(),
            NightPhaseAttackStyle::Asw(style) => AswAttackParams {
                style,
                phase: AswPhase::Night,
                attacker,
                target,
                engagement,
                formation_params,
                historical_params,
            }
            .calc_attack_params(),
        };

        attack_params
    }

    pub fn to_attack(&self) -> Attack {
        self.calc_attack_params().into_attack()
    }
}

pub struct NightAttackParams<'a> {
    pub style: NightAttackStyle,
    pub attacker: &'a BattleMemberRef<'a>,
    pub target: &'a BattleMemberRef<'a>,
    pub formation_params: FormationParams,
    pub historical_params: HistoricalParams,
    pub night_conditions: &'a NightConditions,
}

impl NightAttackParams<'_> {
    pub fn calc_attack_params(&self) -> AttackParams {
        let Self {
            style,
            attacker,
            target,
            ..
        } = self;

        let proficiency_mods = matches!(
            style.attack_type,
            NightAttackType::Aerial | NightAttackType::Swordfish
        )
        .then(|| attacker.proficiency_modifiers(None));

        let attack_power_params = self.calc_attack_power_params(proficiency_mods);
        let hit_rate_params = self.calc_hit_rate_params(proficiency_mods);

        let armor_penetration = attack_power_params
            .as_ref()
            .map_or(0.0, |p| p.armor_penetration);
        let defense_params = DefenseParams::from_target(target, target.side(), armor_penetration);

        let hits = if attacker.level >= 80 {
            style.hits
        } else {
            style.hits.floor()
        };

        AttackParams {
            attack_power_params,
            hit_rate_params,
            defense_params,
            hits,
        }
    }

    fn attacker_night_conditions(&self) -> &NightFleetConditions {
        self.night_conditions
            .night_fleet_conditions(self.attacker.side())
    }

    fn calc_attack_power_params(
        &self,
        proficiency_mods: Option<ProficiencyModifiers>,
    ) -> Option<AttackPowerParams> {
        let Self {
            style,
            attacker,
            target,
            ..
        } = self;

        let anti_inst = target.is_installation();
        let torpedo_effective = !anti_inst || target.special_enemy_type().is_new_supply_depot();
        let attacker_night_conditions = self.attacker_night_conditions();
        let contact_mod = attacker_night_conditions.night_contact_mods().power_mod;

        let damage_mod = attacker.damage_state().common_power_mod();
        let formation_mod = self.formation_params.power_mod;
        let cutin_mod = style.power_mod;
        let cruiser_fit_bonus = attacker.cruiser_fit_bonus();
        let remaining_ammo_mod = attacker.remaining_ammo_mod();

        // 主魚電 | 魚見電 のみでD型補正
        let model_d_small_gun_mod = if style.has_model_d_small_gun_mod() {
            self.attacker.model_d_small_gun_mod()
        } else {
            1.0
        };

        let a14 = damage_mod * formation_mod * cutin_mod * model_d_small_gun_mod;
        let b14 = cruiser_fit_bonus;

        let precap_mod = AttackPowerModifier::new(a14, b14);
        let postcap_mod = Default::default();
        let proficiency_critical_mod = proficiency_mods
            .as_ref()
            .map_or(1.0, |mods| mods.critical_power_mod);

        let special_enemy_mods =
            attacker.special_enemy_mods(target.special_enemy_type(), self.style.attack_type.into());
        let historical_mod = self.historical_params.power_mod;
        let historical_armor_penetration = self.historical_params.armor_penetration;
        let custom_mods = attacker.custom_power_mods();

        let armor_penetration = historical_armor_penetration;

        let base = AttackPowerParams {
            is_cutin: style.is_cutin(),
            cap: NIGHT_POWER_CAP,
            precap_mod,
            postcap_mod,
            remaining_ammo_mod,
            proficiency_critical_mod,
            special_enemy_mods,
            historical_mod,
            armor_penetration,
            custom_mods,
            ..Default::default()
        };

        let result = match style.attack_type {
            NightAttackType::Normal => {
                let firepower = attacker.firepower()? as f64;
                let torpedo = if torpedo_effective {
                    attacker.torpedo()?
                } else {
                    0
                } as f64;
                let ibonus = attacker.gears.sum_by(|gear| gear.ibonuses.night_power);
                let basic = firepower + torpedo + ibonus + contact_mod;
                AttackPowerParams { basic, ..base }
            }
            NightAttackType::Aerial => {
                let night_aerial_power = attacker.night_aerial_power(anti_inst)?;

                AttackPowerParams {
                    basic: night_aerial_power + contact_mod,
                    ..base
                }
            }
            NightAttackType::Swordfish => {
                let night_swordfish_power = attacker.night_swordfish_power(anti_inst)?;

                AttackPowerParams {
                    basic: night_swordfish_power + contact_mod,
                    ..base
                }
            }
        };

        Some(result)
    }

    fn calc_accuracy_term(&self) -> Option<f64> {
        let Self {
            style,
            attacker,
            target,
            ..
        } = self;

        let basic_accuracy_term = attacker.basic_accuracy_term()?;
        let attacker_night_conditions = self.attacker_night_conditions();
        let starshell_mod = attacker_night_conditions.starshell_accuracy_mod();
        let searchlight_mod = attacker_night_conditions.searchlight_accuracy_mod();
        let contact_mod = attacker_night_conditions.night_contact_mods().accuracy_mod;

        let accuracy = attacker.accuracy() as f64;
        let ibonus = attacker.gears.sum_by(|gear| gear.ibonuses.night_accuracy);

        let formation_mod = self.formation_params.accuracy_mod;
        let morale_mod = attacker.morale_state().common_accuracy_mod();
        let cutin_mod = style.accuracy_mod;
        let gunfit_accuracy = attacker.gunfit_accuracy(true);
        let pt_mods = AntiPtImpAccuracyModifiers::new(attacker, target, style.attack_type);
        let historical_mod = self.historical_params.accuracy_mod;

        // 乗算前に切り捨て
        let multiplicand = ((NIGHT_ACCURACY_CONSTANT + starshell_mod) * contact_mod
            + basic_accuracy_term
            + accuracy
            + ibonus
            + pt_mods.amagiri_mod)
            .floor();

        // 夜戦CI補正の位置は陣形補正と同じ
        let post_formation_mod =
            (multiplicand * formation_mod * morale_mod * cutin_mod * pt_mods.multiplicative
                + searchlight_mod
                + gunfit_accuracy
                + pt_mods.additive)
                .floor();

        // 史実補正の位置どこ？
        let accuracy_term = (post_formation_mod
            * pt_mods.ship_type_mod
            * pt_mods.equipment_mod
            * pt_mods.night_mod
            * historical_mod)
            .floor();

        Some(accuracy_term)
    }

    fn calc_evasion_term(&self) -> Option<f64> {
        let target = self.target;
        let formation_mod = self.formation_params.target_evasion_mod;
        let historical_mod = self.historical_params.target_evasion_mod;

        let ship_type_additive = if matches!(target.ship_type, ShipType::CA | ShipType::CAV) {
            5.0
        } else {
            0.0
        };

        let searchlight_evasion_mod = if target.gears.has_type(GearType::Searchlight) {
            0.2
        } else {
            1.0
        };

        let postcap_multiplicative = searchlight_evasion_mod * historical_mod;

        self.target
            .evasion_term(formation_mod, ship_type_additive, postcap_multiplicative)
    }

    fn calc_hit_rate_params(
        &self,
        proficiency_mods: Option<ProficiencyModifiers>,
    ) -> Option<HitRateParams> {
        let accuracy_term = self.calc_accuracy_term()?;
        let evasion_term = self.calc_evasion_term()?;
        let attacker_night_conditions = self.attacker_night_conditions();

        let critical_rate_constant = attacker_night_conditions
            .night_contact_mods()
            .critical_rate_constant;

        let hit_percentage_bonus = proficiency_mods
            .map(|mods| mods.hit_percentage_bonus)
            .unwrap_or_default();

        let critical_percentage_bonus = proficiency_mods
            .map(|mods| mods.critical_percentage_bonus)
            .unwrap_or_default();

        Some(HitRateParams {
            accuracy_term,
            evasion_term,
            target_morale_mod: self.target.morale_state().hit_rate_mod(),
            critical_rate_constant,
            hit_percentage_bonus,
            critical_percentage_bonus,
        })
    }
}
