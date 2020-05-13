import { GearData, ShipData } from "@fleethub/data"

import { MasterGear, GearState, GearImpl } from "./gear"
import { MasterShip, ShipState, createShip } from "./ship"
import { EquipmentImpl, EquipmentState, EquipmentItem, getEquipmentKeys } from "./equipment"
import { FleetState, FleetImpl } from "./fleet"
import { AirbaseState, AirbaseImpl } from "./airbase"

const createEquipment = (
  state: EquipmentState,
  maxSlots: number[],
  createGear: (state: GearState) => GearImpl | undefined
) => {
  const items: EquipmentItem[] = getEquipmentKeys(maxSlots.length).map(([key, slotKey], index) => {
    const gearState = state[key]
    const gear = gearState && createGear(gearState)

    if (key === "gx") return { key, gear }

    const maxSlotSize = maxSlots[index]
    const currentSlotSize = state[slotKey] ?? maxSlotSize

    return { key, gear, currentSlotSize, maxSlotSize }
  })

  return new EquipmentImpl(items)
}

export type FactoryRawData = {
  gears: GearData[]
  ships: ShipData[]
}

export default class Factory {
  public masterGears: MasterGear[]
  public masterShips: MasterShip[]

  constructor(data: FactoryRawData) {
    this.masterGears = data.gears.map((raw) => new MasterGear(raw))
    this.masterShips = data.ships.map((raw) => new MasterShip(raw))
  }

  public findMasterGear = (id: number) => this.masterGears.find((gear) => gear.id === id)

  public findMasterShip = (id: number) => this.masterShips.find((ship) => ship.id === id)

  public createGear = (state: GearState) => {
    const base = this.findMasterGear(state.gearId)
    if (!base) return

    const improvement = base.toImprovementBonuses(state.stars || 0)
    return new GearImpl(state, base, improvement)
  }

  public createShip = (state: ShipState, createGear = this.createGear) => {
    const { shipId } = state
    const base = this.findMasterShip(shipId)
    if (!base) return

    const equipment = createEquipment(state, base.slots, createGear)

    return createShip(state, base, equipment)
  }

  public createFleet = (state: FleetState, createShip = this.createShip) => {
    const ships = state.ships.map((shipState) => shipState && createShip(shipState))

    return new FleetImpl(state, ships)
  }

  public createAirbase = (state: AirbaseState, createGear = this.createGear) => {
    const equipment = createEquipment(state, [18, 18, 18, 18], createGear)

    return new AirbaseImpl(equipment)
  }
}
