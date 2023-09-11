use serde::{Deserialize, Serialize};
use tsify::Tsify;

use crate::types::{AttackPowerModifier, CustomPowerModifiers, SpecialEnemyModifiers};

use super::HitType;

#[derive(Debug, Clone, Serialize, Deserialize, Tsify)]
pub struct AttackPowerParams {
    pub is_cutin: bool,
    pub basic: f64,
    pub cap: f64,
    pub precap_mod: AttackPowerModifier,
    pub postcap_mod: AttackPowerModifier,
    pub ap_shell_mod: Option<f64>,
    pub aerial_power: Option<f64>,
    pub proficiency_critical_mod: f64,
    pub armor_penetration: f64,
    pub remaining_ammo_mod: f64,
    pub balloon_mod: f64,
    pub special_enemy_mods: SpecialEnemyModifiers,
    pub historical_mod: AttackPowerModifier,
    pub custom_mods: CustomPowerModifiers,
}

#[derive(Debug, Default, Clone, Serialize, Deserialize, Tsify)]
pub struct AttackPower {
    pub precap: f64,
    pub is_capped: bool,
    pub capped: f64,
    pub normal: f64,
    pub critical: f64,
    pub armor_penetration: f64,
    pub remaining_ammo_mod: f64,
}

impl AttackPower {
    pub fn get_attack_term(&self, hit_type: HitType) -> f64 {
        match hit_type {
            HitType::Miss => 0.0,
            HitType::Normal => self.normal,
            HitType::Critical => self.critical,
        }
    }
}

impl AttackPowerParams {
    pub fn calc(&self) -> AttackPower {
        let cap = self.cap;
        let precap = self.apply_precap_mods(self.basic);

        let is_capped = precap > cap;

        let capped = if is_capped {
            cap + (precap - cap).sqrt()
        } else {
            precap
        };

        let (normal, critical) = self.apply_postcap_mods(capped);

        AttackPower {
            precap,
            is_capped,
            capped,
            normal,
            critical,
            armor_penetration: self.armor_penetration,
            remaining_ammo_mod: self.remaining_ammo_mod,
        }
    }

    fn apply_precap_mods(&self, basic: f64) -> f64 {
        let mut precap = basic;

        let SpecialEnemyModifiers {
            precap_general_mod,
            stype_mod,
            landing_craft_synergy_mod,
            toku_daihatsu_tank_mod,
            m4a1dd_mod,
            honi_mod,
            ..
        } = &self.special_enemy_mods;

        precap = stype_mod.apply(precap);
        precap *= precap_general_mod.a;
        precap = toku_daihatsu_tank_mod.apply(precap);
        precap = m4a1dd_mod.apply(precap);
        precap = honi_mod.apply(precap);
        precap = landing_craft_synergy_mod.apply(precap);
        precap += precap_general_mod.b;

        precap = self.custom_mods.basic_power_mod.apply(precap);

        if let Some(v) = self.aerial_power {
            precap = ((precap + v) * 1.5).floor() + 25.0
        }

        precap = self
            .precap_mod
            .compose(self.custom_mods.precap_mod)
            .apply(precap);

        precap
    }

    fn apply_postcap_mods(&self, capped: f64) -> (f64, f64) {
        let mut postcap = capped.floor();

        let SpecialEnemyModifiers {
            postcap_general_mod,
            pt_mod,
            ..
        } = &self.special_enemy_mods;

        postcap = self
            .postcap_mod
            .compose(self.custom_mods.postcap_mod)
            .apply(postcap);

        // https://twitter.com/yukicacoon/status/1698563969106202886
        // なんで???
        if self.is_cutin {
            postcap *= self.balloon_mod;

            if let Some(v) = self.ap_shell_mod {
                postcap = (postcap * v).floor()
            }
        } else {
            if let Some(v) = self.ap_shell_mod {
                postcap = (postcap * v).floor()
            }

            postcap *= self.balloon_mod;
        }

        postcap = postcap_general_mod.apply(postcap);

        let post_historical_power = self
            .historical_mod
            .compose(self.custom_mods.historical_mod)
            .apply(postcap);

        let post_pt_power = if let Some(pt_mod) = pt_mod {
            pt_mod.apply(post_historical_power * 0.3 + post_historical_power.sqrt() + 10.0)
        } else {
            post_historical_power
        };

        let normal = post_pt_power;

        // https://twitter.com/hedgehog_hasira/status/1630585333279784962
        let critical = (normal * self.proficiency_critical_mod * 1.5).floor();

        (normal, critical)
    }
}

impl Default for AttackPowerParams {
    fn default() -> Self {
        Self {
            is_cutin: false,
            basic: 0.0,
            cap: f64::MAX,
            precap_mod: Default::default(),
            postcap_mod: Default::default(),
            ap_shell_mod: Default::default(),
            aerial_power: Default::default(),
            proficiency_critical_mod: 1.0,
            armor_penetration: 0.0,
            remaining_ammo_mod: 1.0,
            balloon_mod: 1.0,
            special_enemy_mods: Default::default(),
            historical_mod: Default::default(),
            custom_mods: Default::default(),
        }
    }
}

#[cfg(test)]
mod test {

    use super::*;

    #[test]
    fn test_attack_power() {
        let precap = AttackPowerParams {
            basic: 150.0,
            precap_mod: AttackPowerModifier { a: 1.2, b: 0.0 },
            custom_mods: CustomPowerModifiers {
                precap_mod: AttackPowerModifier { a: 1.3, b: 0.0 },
                ..Default::default()
            },
            ..Default::default()
        }
        .calc();

        assert_eq!(precap.normal, 150.0 * 1.2 * 1.3);

        let postcap = AttackPowerParams {
            basic: 200.0,
            cap: 180.0,
            postcap_mod: AttackPowerModifier { a: 1.2, b: 0.0 },
            custom_mods: CustomPowerModifiers {
                postcap_mod: AttackPowerModifier { a: 1.3, b: 0.0 },
                ..Default::default()
            },
            ..Default::default()
        }
        .calc();

        assert_eq!(
            postcap.normal,
            (180.0 + 20.0_f64.sqrt()).floor() * 1.3 * 1.2
        );
    }
}
