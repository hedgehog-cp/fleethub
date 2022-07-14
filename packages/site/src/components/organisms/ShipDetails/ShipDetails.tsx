import styled from "@emotion/styled";
import BuildIcon from "@mui/icons-material/Build";
import { Button, Stack } from "@mui/material";
import { Comp, Ship, ShipEnvironment } from "fleethub-core";
import { produce } from "immer";
import React, { useEffect } from "react";

import {
  useAppDispatch,
  useRootSelector,
  useFhCore,
  useModal,
} from "../../../hooks";
import {
  shipDetailsSlice,
  ShipDetailsState,
  shipSelectSlice,
} from "../../../store";
import { Flexbox } from "../../atoms";
import AirStateSelect from "../AirStateSelect";
import CustomModifiersDialog from "../CustomModifiersDialog";
import EngagementSelect from "../EngagementSelect";
import ShipCard from "../ShipCard";

import AttackPowerAnalyzer from "./AttackPowerAnalyzer";
import ShipDetailsEnemyList from "./ShipDetailsEnemyList";
import ShipParamsSettings, { toSide } from "./ShipParamsSettings";

function initOrgType(
  current: ShipDetailsState,
  env: ShipEnvironment
): ShipDetailsState {
  const next = produce(current, (draft) => {
    const playerSide = toSide(env.org_type || "Single");
    const enemySide = draft.enemy.org_type && toSide(draft.enemy.org_type);

    if (!enemySide || playerSide === enemySide) {
      if (playerSide === "Player") {
        draft.enemy.org_type = "EnemySingle";
      } else {
        draft.enemy.org_type = "Single";
      }
    }

    Object.assign(draft.player, env);
  });

  return next;
}

type ShipDetailsProps = {
  ship: Ship;
  comp?: Comp;
};

const ShipDetails: React.FCX<ShipDetailsProps> = ({
  className,
  ship,
  comp,
}) => {
  const { core } = useFhCore();

  const state = useRootSelector((root) => root.shipDetails);
  const dispatch = useAppDispatch();

  const PlayerShipEnvModal = useModal();
  const EnemyShipEnvModal = useModal();

  const update = (payload: Partial<ShipDetailsState>) => {
    dispatch(shipDetailsSlice.actions.update(payload));
  };

  const handleEnemySelect = () => {
    dispatch(
      shipSelectSlice.actions.create({
        abyssal: true,
        position: { tag: "shipDetails" },
      })
    );
  };

  useEffect(() => {
    if (!comp) return;

    const env = comp.create_warfare_ship_environment(
      ship,
      state.player.formation
    );

    update(initOrgType(state, env));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Stack className={className} gap={1}>
      <Flexbox gap={1}>
        <EngagementSelect
          value={state.engagement}
          onChange={(engagement) => update({ engagement })}
        />
        <AirStateSelect
          value={state.air_state}
          onChange={(air_state) => update({ air_state })}
        />
        <Button
          variant="contained"
          color="primary"
          startIcon={<BuildIcon />}
          onClick={PlayerShipEnvModal.show}
        >
          自艦隊設定
        </Button>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<BuildIcon />}
          onClick={EnemyShipEnvModal.show}
        >
          相手艦設定
        </Button>
        <Button variant="contained" color="primary" onClick={handleEnemySelect}>
          敵を追加して攻撃力を計算する
        </Button>
      </Flexbox>

      <PlayerShipEnvModal>
        <ShipParamsSettings
          value={state.player}
          onChange={(player) => update({ player })}
        />
      </PlayerShipEnvModal>
      <EnemyShipEnvModal>
        <ShipParamsSettings
          value={state.enemy}
          onChange={(enemy) => update({ enemy })}
        />
      </EnemyShipEnvModal>

      <Stack gap={1} flexDirection="row">
        <Stack gap={1} flexBasis="100%">
          <ShipCard ship={ship} comp={comp} visibleMiscStats disableDetails />
          <CustomModifiersDialog ship={ship} />
        </Stack>
        <AttackPowerAnalyzer
          css={{ flexBasis: "100%" }}
          core={core}
          state={state}
          ship={ship}
        />
      </Stack>

      <ShipDetailsEnemyList state={state} ship={ship} />
    </Stack>
  );
};

export default styled(ShipDetails)`
  min-height: 80vh;
  padding-bottom: 400px;
`;
