import Image from "next/image";
import React from "react";

const FuelIcon: React.FCX = (props) => (
  <Image {...props} width={20} height={20} src={"/icons/fuel.png"} alt="fuel" />
);

export default FuelIcon;
