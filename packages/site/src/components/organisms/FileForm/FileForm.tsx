import { useTranslation } from "next-i18next";
import React from "react";

import { FileEntity } from "../../../store";
import { Flexbox, FolderIcon, PlanIcon } from "../../atoms";
import { CopyButton, DeleteButton, TextField } from "../../molecules";

type FileFormProps = {
  file: FileEntity;
  onCopy: () => void;
  onRemove: () => void;
  onNameChange: (name: string) => void;
  onDescriptionChange: (name: string) => void;
};

const FileForm: React.FCX<FileFormProps> = ({
  className,
  file,
  onCopy,
  onRemove,
  onNameChange,
  onDescriptionChange,
}) => {
  const { t } = useTranslation("common");
  const icon = file.type === "folder" ? <FolderIcon /> : <PlanIcon />;

  return (
    <div className={className}>
      <Flexbox gap={1}>
        <TextField
          placeholder="name"
          fullWidth
          startLabel={icon}
          value={file.name}
          onChange={onNameChange}
        />
        <CopyButton title={t("Copy")} onClick={onCopy} />
        <DeleteButton title={t("Remove")} onClick={onRemove} />
      </Flexbox>

      <TextField
        label="説明"
        variant="outlined"
        fullWidth
        value={file.description}
        onChange={onDescriptionChange}
        multiline
      />
    </div>
  );
};

export default FileForm;
