import { useState } from 'react';
import { Building2, Users, Globe, Calendar, Search } from 'lucide-react';
import OrganisationsTrack from '../components/acquisition/OrganisationsTrack';
import ReferralTrack from '../components/acquisition/ReferralTrack';
import CommunityTrack from '../components/acquisition/CommunityTrack';
import EventsTrack from '../components/acquisition/EventsTrack';

const TABS = [
  { id: 'organisations', label: 'Organisations', icon: Building2 },
  { id: 'referrals', label: 'Referral Network', icon: Users },
  { id: 'community', label: 'Community Channels', icon: Globe },
  { id: 'events', label: 'Events', icon: Calendar },
];

export default function AcquisitionHub() {
  const [activeTab, setActiveTab] = useState('organisations');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <Building2 size={24} className="text-propela-purple" />
        <h1 className="text-2xl font-semibold text-gray-900">Nurse Acquisition Hub</h1>
      </div>
      <p className="text-gray-500 text-sm mb-6">
        Track every channel through which Propela finds nurses. Four tracks: Organisations, Referral Network, Community Channels, and Events.
      </p>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 mb-4 border-b border-gray-200">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === id
                ? 'border-propela-purple text-propela-purple'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Universal Filter Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeTab}...`}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-propela-purple focus:border-propela-purple"
          />
        </div>
      </div>

      {/* Track Content */}
      {activeTab === 'organisations' && <OrganisationsTrack searchQuery={searchQuery} />}
      {activeTab === 'referrals' && <ReferralTrack searchQuery={searchQuery} />}
      {activeTab === 'community' && <CommunityTrack searchQuery={searchQuery} />}
      {activeTab === 'events' && <EventsTrack searchQuery={searchQuery} />}
    </div>
  );
}
