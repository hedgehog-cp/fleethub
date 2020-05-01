import { ShipClass } from "@fleethub/data"

import { ShipImpl } from "./Ship"
import { ShipCommonBase } from "./types"

import { ShipStatsStub, EquipmentMock, GearStub } from "../utils"

const getMocks = () => {
  const base = {
    shipId: 0,
    shipClass: 0,
    shipType: 0,
    sortId: 0,
    name: "",
    ruby: "",
    is: jest.fn(),
    canEquip: jest.fn(),
  }

  const stats = new ShipStatsStub()
  const equipment = new EquipmentMock()
  const getNextBonusesMockFn = jest.fn()

  return [base, stats, equipment, getNextBonusesMockFn] as const
}

describe("ShipImpl", () => {
  it("constructor", () => {
    const [base, stats, equipment, getNextBonusesMockFn] = getMocks()
    const ship = new ShipImpl(base, stats, equipment, getNextBonusesMockFn)

    expect(base).toMatchObject(base)
    expect(ship.equipment).toBe(equipment)
    expect(ship.getNextBonuses).toBe(getNextBonusesMockFn)

    const statKeys = Object.keys(stats) as Array<keyof typeof stats>
    statKeys.forEach((key) => {
      expect(ship[key]).toBe(stats[key])
    })
  })

  it("fleetLosFactor = naked-los + sum(ObservationSeaplane-los * [sqrt(slotSize)])", () => {
    const [base, stats, equipment, getNextBonusesMockFn] = getMocks()
    const ship = new ShipImpl(base, stats, equipment, getNextBonusesMockFn)
    stats.los.naked = 37

    equipment.sumBy.mockImplementationOnce((cb) => cb(new GearStub(), null, 0))
    expect(ship.fleetLosFactor).toBe(37 + 0)

    const observation = GearStub.fromAttrs("ObservationSeaplane")
    observation.los = 8
    equipment.sumBy.mockImplementationOnce((cb) => cb(observation, null, 0))
    expect(ship.fleetLosFactor).toBe(37 + 0)

    equipment.sumBy.mockImplementationOnce((cb) => cb(observation, null, 5))
    expect(ship.fleetLosFactor).toBe(37 + 8 * Math.floor(Math.sqrt(5)))
  })

  it("軽巡軽量砲補正 = sqrt(singleGunCount) + 2 * sqrt(twinGunCount)", () => {
    const [base, stats, equipment, getNextBonusesMockFn] = getMocks()
    const ship = new ShipImpl(base, stats, equipment, getNextBonusesMockFn)

    expect(ship.cruiserFitBonus).toBe(0)

    base.is.mockReturnValueOnce(true)
    equipment.count.mockReturnValueOnce(2).mockReturnValueOnce(3)
    expect(ship.cruiserFitBonus).toBe(Math.sqrt(2) + 2 * Math.sqrt(3))
  })

  it("Zara砲補正 = sqrt(203mm/53 連装砲の本数)", () => {
    const [base, stats, equipment, getNextBonusesMockFn] = getMocks()
    base.shipClass = ShipClass.ZaraClass
    const ship = new ShipImpl(base, stats, equipment, getNextBonusesMockFn)

    equipment.count.mockReturnValueOnce(2)
    expect(ship.cruiserFitBonus).toBe(Math.sqrt(2))
  })

  it("対艦空撃力 = [装備雷装 + [1.3 * 装備爆装]] + 15", () => {
    const [base, stats, equipment, getNextBonusesMockFn] = getMocks()
    const ship = new ShipImpl(base, stats, equipment, getNextBonusesMockFn)
    stats.torpedo.equipment = 12
    equipment.sumBy.mockReturnValueOnce(6)

    expect(ship.calcAirPower()).toBe(Math.floor(12 + Math.floor(1.3 * 6)) + 15)
  })

  it("対地空撃力 = [1.3 * 対地爆装] + 15", () => {
    const [base, stats, equipment, getNextBonusesMockFn] = getMocks()
    const ship = new ShipImpl(base, stats, equipment, getNextBonusesMockFn)
    stats.torpedo.equipment = 100
    equipment.sumBy.mockReturnValueOnce(6)

    expect(ship.calcAirPower(true)).toBe(Math.floor(1.3 * 6) + 15)
  })

  it("艦娘命中項 = 2 * sqrt(level) + 1.5 * sqrt(luck)", () => {
    const [base, stats, equipment, getNextBonusesMockFn] = getMocks()
    stats.level = 175
    stats.luck.displayed = 110
    const ship = new ShipImpl(base, stats, equipment, getNextBonusesMockFn)

    expect(ship.basicAccuracyTerm).toBe(2 * Math.sqrt(175) + 1.5 * Math.sqrt(110))
  })
})
