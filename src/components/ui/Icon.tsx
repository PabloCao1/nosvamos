import { useMemo } from "react";
import { Airplane } from "reicon/icons/Airplane";
import { ArrowUpRight } from "reicon/icons/ArrowUpRight";
import { Bell } from "reicon/icons/Bell";
import { Bed } from "reicon/icons/Bed";
import { BagShopping } from "reicon/icons/BagShopping";
import { Bus } from "reicon/icons/Bus";
import { Calendar } from "reicon/icons/Calendar";
import { Car } from "reicon/icons/Car";
import { Check } from "reicon/icons/Check";
import { ChevronRight } from "reicon/icons/ChevronRight";
import { ChevronLeft } from "reicon/icons/ChevronLeft";
import { Clock } from "reicon/icons/Clock";
import { CloudCheck } from "reicon/icons/CloudCheck";
import { Eye } from "reicon/icons/Eye";
import { Edit } from "reicon/icons/Edit";
import { ForkKnife } from "reicon/icons/ForkKnife";
import { Filter } from "reicon/icons/Filter";
import { Home } from "reicon/icons/Home";
import { House } from "reicon/icons/House";
import { Location } from "reicon/icons/Location";
import { Lock } from "reicon/icons/Lock";
import { Map } from "reicon/icons/Map";
import { MoreH } from "reicon/icons/MoreH";
import { Plus } from "reicon/icons/Plus";
import { Receipt } from "reicon/icons/Receipt";
import { Search } from "reicon/icons/Search";
import { Save } from "reicon/icons/Save";
import { Shield } from "reicon/icons/Shield";
import { Ship } from "reicon/icons/Ship";
import { Setting } from "reicon/icons/Setting";
import { Suitcase } from "reicon/icons/Suitcase";
import { Ticket } from "reicon/icons/Ticket";
import { Tram } from "reicon/icons/Tram";
import { Trash } from "reicon/icons/Trash";
import { User } from "reicon/icons/User";
import { Users } from "reicon/icons/Users";
import { Wallet } from "reicon/icons/Wallet";
import { Wifi } from "reicon/icons/Wifi";
import { WifiOff } from "reicon/icons/WifiOff";
import type { IconFunction } from "reicon/createIcon";

const icons = {
  airplane: Airplane,
  apartment: House,
  bus: Bus,
  car: Car,
  food: ForkKnife,
  filter: Filter,
  ferry: Ship,
  hotel: Bed,
  arrowUpRight: ArrowUpRight,
  bell: Bell,
  bed: Bed,
  calendar: Calendar,
  check: Check,
  chevronRight: ChevronRight,
  chevronLeft: ChevronLeft,
  clock: Clock,
  cloudCheck: CloudCheck,
  eye: Eye,
  edit: Edit,
  home: Home,
  location: Location,
  lock: Lock,
  map: Map,
  more: MoreH,
  plus: Plus,
  receipt: Receipt,
  search: Search,
  save: Save,
  insurance: Shield,
  shopping: BagShopping,
  settings: Setting,
  suitcase: Suitcase,
  ticket: Ticket,
  train: Tram,
  trash: Trash,
  user: User,
  users: Users,
  wallet: Wallet,
  wifi: Wifi,
  wifiOff: WifiOff,
} satisfies Record<string, IconFunction>;

export type IconName = keyof typeof icons;

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  label?: string;
  weight?: "Outline" | "Filled";
}

export function Icon({
  name,
  size = 24,
  className,
  label,
  weight = "Outline",
}: IconProps) {
  const markup = useMemo(
    () => icons[name]({ size, color: "currentColor", weight }).outerHTML,
    [name, size, weight],
  );

  return (
    <span
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={className}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
