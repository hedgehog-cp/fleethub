import { MapNodeType } from "@fleethub/data"

import { FleetState, Fleet } from "../fleet"
import { AirbaseState, Airbase } from "../airbase"
import { Formation } from "../common"
import { EnemyFleetState } from "../enemy"

export type FleetKey = "f1" | "f2" | "f3" | "f4"

type FleetRecord = Partial<Record<FleetKey, FleetState>>

export type AirbaseKey = "a1" | "a2" | "a3"

type AirbaseRecord = Partial<Record<AirbaseKey, AirbaseState>>

export type NodePlan = {
  type: MapNodeType
  formation?: Formation
  enemy?: EnemyFleetState
  lbas?: AirbaseKey[]
}

export type PlanStateBase = {
  name?: string
  hqLevel?: number
  nodes?: NodePlan[]
}

export type PlanState = PlanStateBase & FleetRecord & AirbaseRecord

export type Plan = Required<PlanStateBase> & {
  fleetEntries: Array<[FleetKey, Fleet]>
  airbaseEntries: Array<[AirbaseKey, Airbase]>

  interceptionPower: number
  highAltitudeInterceptionPower: number
}
