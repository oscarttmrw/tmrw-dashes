import {
  LayoutDashboard,
  DollarSign,
  Users,
  Stethoscope,
  HeadphonesIcon,
  Megaphone,
  ListChecks,
  Target,
  UsersRound,
  Upload,
  Settings,
  RefreshCw,
  FileText,
  Database,
  ClockIcon,
  UserPlus,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: any;
  section: 'home' | 'operations' | 'management' | 'admin';
  badge?: number;
  disabled?: boolean;
  disabledReason?: string;
}

export const navigation: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard, section: 'home' },

  { label: 'Financial', href: '/financial', icon: DollarSign, section: 'operations' },
  { label: 'Members', href: '/members', icon: Users, section: 'operations' },
  { label: 'Delivery', href: '/clinical', icon: Stethoscope, section: 'operations' },
  { label: 'Retention', href: '/retention', icon: RefreshCw, section: 'operations' },
  { label: 'Support', href: '/support', icon: HeadphonesIcon, section: 'operations' },
  { label: 'Marketing', href: '/marketing', icon: Megaphone, section: 'operations' },

  { label: 'Strategy', href: '/strategy', icon: Target, section: 'management' },
  { label: 'EOS / L10', href: '/eos', icon: ListChecks, section: 'management' },
  { label: 'Board Pack', href: '/board-pack', icon: FileText, section: 'management' },
  { label: 'Team', href: '/team', icon: UsersRound, section: 'management' },
  {
    label: 'Data Registry',
    href: '/admin/registry',
    icon: Database,
    section: 'management',
    disabled: true,
    disabledReason: 'Being redesigned — pending review.',
  },

  { label: 'Data Upload', href: '/admin/upload', icon: Upload, section: 'admin' },
  { label: 'Upload History', href: '/admin/upload-history', icon: ClockIcon, section: 'admin' },
  { label: 'Invite Users', href: '/admin/invite', icon: UserPlus, section: 'admin' },
  { label: 'Settings', href: '/admin/settings', icon: Settings, section: 'admin' },
];
