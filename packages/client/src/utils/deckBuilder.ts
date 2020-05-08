import { DeckBuilder } from "gkcoi"
import { Ship, Fleet } from "@fleethub/core"

type DeckBuilderFleet = NonNullable<DeckBuilder["f1"]>
type DeckBuilderShip = NonNullable<DeckBuilderFleet["s1"]>

const shipToDeck = (ship: Ship): DeckBuilderShip => {
  const items: DeckBuilderShip["items"] = {}
  ship.equipment.forEach((gear, index) => {
    items[`i${index + 1}` as keyof typeof items] = {
      id: gear.gearId,
      rf: gear.stars,
      mas: gear.ace,
    }
  })

  return {
    id: ship.shipId,
    lv: ship.level,
    items,
    hp: ship.maxHp.displayed,
    fp: ship.firepower.displayed,
    tp: ship.torpedo.displayed,
    aa: ship.antiAir.displayed,
    ar: ship.armor.displayed,
    asw: ship.asw.displayed,
    ev: ship.evasion.displayed,
    los: ship.los.displayed,
    luck: ship.luck.displayed,
  }
}

const fleetToDeck = (fleet: Fleet): DeckBuilder => {
  const f1: DeckBuilder["f1"] = {}

  fleet.ships.forEach((ship, index) => {
    if (!ship) return

    const key = `s${index + 1}` as "s1"
    f1[key] = shipToDeck(ship)
  })

  return {
    lang: "en",
    theme: "dark",
    hqlv: 120,
    f1,
  }
}
