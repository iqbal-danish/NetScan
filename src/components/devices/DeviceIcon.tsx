import React from "react";
import {
  Router,
  Monitor,
  Laptop,
  Smartphone,
  Tablet,
  Tv,
  Printer,
  Gamepad2,
  Speaker,
  Cpu,
  Camera,
  Server,
  HelpCircle,
} from "lucide-react";
import { DeviceType } from "../../types";

interface DeviceIconProps {
  type: DeviceType;
  className?: string;
  size?: number;
}

export const DeviceIcon: React.FC<DeviceIconProps> = ({
  type,
  className = "w-5 h-5",
  size = 20,
}) => {
  switch (type) {
    case "router":
      return <Router size={size} className={className} />;
    case "desktop":
      return <Monitor size={size} className={className} />;
    case "laptop":
      return <Laptop size={size} className={className} />;
    case "phone":
      return <Smartphone size={size} className={className} />;
    case "tablet":
      return <Tablet size={size} className={className} />;
    case "tv":
      return <Tv size={size} className={className} />;
    case "printer":
      return <Printer size={size} className={className} />;
    case "game_console":
      return <Gamepad2 size={size} className={className} />;
    case "smart_speaker":
      return <Speaker size={size} className={className} />;
    case "iot":
      return <Cpu size={size} className={className} />;
    case "camera":
      return <Camera size={size} className={className} />;
    case "server":
      return <Server size={size} className={className} />;
    case "unknown":
    default:
      return <HelpCircle size={size} className={className} />;
  }
};
