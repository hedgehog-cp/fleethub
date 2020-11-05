import { ShipClass, GearId, GearCategory } from "@fleethub/data"

import { Ship } from "../../ship"
import { calcAttackPower } from "../AttackPower"
import { getPossibleDaySpecialAttackTypes } from "./DaySpecialAttackType"
import { createDaySpecialAttack, calcObservationTerm, DaySpecialAttack } from "./DaySpecialAttack"
import { AirState } from "../../common"
import { RateMap } from "../../utils"
import { getApShellModifiers } from "./ApShellModifiers"

const ShellingCap = 180

type PowerParams = {
  targetIsArmored: boolean
  targetIsInstallation: boolean
  fleetFactor: number

  formationModifier: number
  engagementModifier: number
  specialAttackModifier: number
}

export type ShipShellingAbility = {
  observationTerm: number
  rateMap: RateMap<DaySpecialAttack>
  canSpecialAttack: boolean
}

export class ShipShellingCalculator {
  constructor(private ship: Ship) {}

  private get apShellModifiers() {
    const { equipment } = this.ship
    return getApShellModifiers({
      hasMainGun: equipment.has((gear) => gear.is("MainGun")),
      hasApShell: equipment.has((gear) => gear.categoryIs("ApShell")),
      hasRader: equipment.has((gear) => gear.is("Radar")),
      hasSecondaryGun: equipment.has((gear) => gear.categoryIs("SecondaryGun")),
    })
  }

  private getPossibleDaySpecialAttackTypes() {
    const { ship } = this
    const { equipment } = ship
    return getPossibleDaySpecialAttackTypes({
      isCarrierShelling: ship.isCarrierLike,
      isIseClassK2: ship.shipClass === "IseClass" && ship.is("Kai2"),
      hasObservationSeaplane: equipment.hasAircraft((gear) => gear.is("ObservationSeaplane")),

      mainGunCount: equipment.count((gear) => gear.is("MainGun")),
      secondaryGunCount: equipment.count((gear) => gear.categoryIs("SecondaryGun")),
      hasApShell: equipment.has((gear) => gear.categoryIs("ApShell")),
      hasRader: equipment.has((gear) => gear.is("Radar")),

      zuiunAircraftCount: equipment.countAircraft(({ gearId }) =>
        [
          GearId["瑞雲"],
          GearId["瑞雲(六三一空)"],
          GearId["瑞雲(六三四空)"],
          GearId["瑞雲(六三四空/熟練)"],
          GearId["瑞雲12型"],
          GearId["瑞雲12型(六三四空)"],
          GearId["瑞雲改二(六三四空)"],
          GearId["瑞雲改二(六三四空/熟練)"],
        ].includes(gearId)
      ),
      suisei634AircraftCount: equipment.countAircraft(({ gearId }) =>
        [
          GearId["彗星一二型(六三四空/三号爆弾搭載機)"],
          GearId["彗星二二型(六三四空)"],
          GearId["彗星二二型(六三四空/熟練)"],
        ].includes(gearId)
      ),

      hasCbFighterAircraft: equipment.hasAircraft((gear) => gear.categoryIs("CbFighter")),
      cbBomberAircraftCount: equipment.countAircraft((gear) => gear.categoryIs("CbDiveBomber")),
      hasCbTorpedoBomberAircraft: equipment.hasAircraft((gear) => gear.categoryIs("CbTorpedoBomber")),
    })
  }

  public calcObservationTerm = (fleetLosModifier: number, isMainFlagship: boolean, airState: AirState) => {
    const { ship } = this

    return calcObservationTerm({
      luck: ship.luck.displayed,
      equipmentLos: ship.los.equipment,
      isMainFlagship,
      fleetLosModifier,
      airState,
    })
  }

  public getShipShellingAbility = (
    fleetLosModifier: number,
    isMainFlagship: boolean,
    airState: AirState
  ): ShipShellingAbility => {
    const observationTerm = this.calcObservationTerm(fleetLosModifier, isMainFlagship, airState)

    const attacks = this.getPossibleDaySpecialAttackTypes().map(createDaySpecialAttack)
    const rateMap = new RateMap<DaySpecialAttack>()

    attacks.forEach((attack) => {
      const attackRate = Math.min(observationTerm / attack.denominator, 1)
      const actualRate = rateMap.complement * attackRate
      rateMap.set(attack, actualRate)
    })

    return { observationTerm, rateMap, canSpecialAttack: attacks.length > 0 }
  }

  public createPower = ({
    targetIsArmored,
    targetIsInstallation,
    fleetFactor,
    formationModifier,
    engagementModifier,
    specialAttackModifier,
  }: PowerParams) => {
    const { ship } = this
    const { cruiserFitBonus } = ship
    const firepower = ship.firepower.displayed
    const improvementBonus = ship.equipment.sumBy((gear) => gear.improvementBonuses.shellingPower)

    const basic = 5 + firepower + improvementBonus + fleetFactor
    const airPower = ship.isCarrierLike ? ship.calcAirPower(targetIsInstallation) : undefined

    const healthModifier = ship.health.commonPowerModifier

    const apShellModifier = targetIsArmored ? this.apShellModifiers.power : undefined

    const a14 = formationModifier * engagementModifier * healthModifier
    const b14 = cruiserFitBonus
    const a11 = specialAttackModifier

    const attackPower = calcAttackPower({ basic, airPower, cap: ShellingCap, a14, b14, a11, apShellModifier })

    return {
      airPower,
      fleetFactor,

      formationModifier,
      engagementModifier,
      healthModifier,
      cruiserFitBonus,
      specialAttackModifier,
      apShellModifier,

      ...attackPower,
    }
  }

  public createAccuracy = ({ fleetFactor, formationModifier }: { fleetFactor: number; formationModifier: number }) => {
    const { accuracy, basicAccuracyTerm, morale, equipment } = this.ship

    const fitGunBonus = NaN
    const specialAttackModifier = NaN
    const apShellModifier = NaN

    const moraleModifier = morale.commonAccuracyModifier
    const improvementModifier = equipment.sumBy((gear) => gear.improvementBonuses.shellingAccuracy)

    const base = Math.floor(fleetFactor + basicAccuracyTerm + accuracy.equipment + improvementModifier)
    return Math.floor(
      (base * formationModifier * moraleModifier + fitGunBonus) * specialAttackModifier * apShellModifier
    )
  }
}
