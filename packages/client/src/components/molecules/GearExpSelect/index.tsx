import React from "react"
import styled from "styled-components"

import Button from "@material-ui/core/Button"
import Tooltip from "@material-ui/core/Tooltip"
import Popover from "@material-ui/core/Popover"

import ProficiencyIcon from "./ProficiencyIcon"
import { Flexbox, NumberInput } from "../../../components"
import { useAnchorEl } from "../../../hooks"

const exps = [0, 10, 25, 40, 55, 70, 85, 100, 120]

const anchorOrigin = {
  vertical: "bottom",
  horizontal: "center",
} as const

type Props = {
  className?: string
  exp: number
  onChange?: (value: number) => void
}

const GearExpSelect: React.FC<Props> = ({ className, exp, onChange }) => {
  const { onOpen, ...hendler } = useAnchorEl()

  const handleChange: React.MouseEventHandler = React.useCallback(
    (event) => {
      onChange && onChange(Number(event.currentTarget.id))
      hendler.onClose()
    },
    [onChange, hendler]
  )

  return (
    <div className={className}>
      <Tooltip title="熟練度選択">
        <Button onClick={onOpen}>
          <ProficiencyIcon exp={exp} />
        </Button>
      </Tooltip>

      <Popover anchorOrigin={anchorOrigin} {...hendler}>
        <Flexbox>
          {exps.map((boundary) => (
            <Button key={boundary} id={boundary.toString()} onClick={handleChange}>
              <ProficiencyIcon exp={boundary} />
            </Button>
          ))}
          <NumberInput value={exp} onChange={onChange} min={0} max={120} />
        </Flexbox>
      </Popover>
    </div>
  )
}

export default styled(GearExpSelect)`
  button {
    padding: 0;
  }
  input {
    width: 64px;
    margin: 0 8px;
  }
`
