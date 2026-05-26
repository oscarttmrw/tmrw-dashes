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
  /** Small text pill shown next to the label. e.g. 'DEMO', 'WIP'. */
  tag?: string;
  disabled?: boolean;
  disabledReason?: string;
}

export const navigation: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard, section: 'home' },

  { label: 'Financial', href: '/financial', icon: DollarSign, section: 'operations' },
  { label: 'Marketing', href: '/marketing', icon: Megaphone, section: 'operations' },
  { label: 'Members', href: '/members', icon: Users, section: 'operations', tag: 'DEMO' },
  { label: 'Delivery', href: '/clinical', icon: Stethoscope, section: 'operations', tag: 'DEMO' },
  { label: 'Retention', href: '/retention', icon: RefreshCw, section: 'operations', tag: 'DEMO' },
  { label: 'Support', href: '/support', icon: HeadphonesIcon, section: 'operations', tag: 'DEMO' },

  { label: 'Strategy', href: '/strategy', icon: Target, section: 'management', disabled: true, disabledReason: 'Coming in Phase 2.' },
  { label: 'EOS / L10', href: '/eos', icon: ListChecks, section: 'management', disabled: true, disabledReason: 'Coming in Phase 2.' },
  { label: 'Board Pack', href: '/board-pack', icon: FileText, section: 'management', disabled: true, disabledReason: 'Coming in Phase 2.' },
  { label: 'Team', href: '/team', icon: UsersRound, section: 'management', disabled: true, disabledReason: 'Coming in Phase 2.' },
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
