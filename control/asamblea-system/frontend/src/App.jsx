import { useState } from 'react';
import AttendeeList from './components/AttendeeList';
import VotingPanel from './components/VotingPanel';

function App() {
  const [activeTab, setActiveTab] = useState('attendees');

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Assembly Voting System</h1>
        </header>

        <div className="mb-4 border-b border-gray-200">
          <ul className="flex flex-wrap -mb-px text-sm font-medium text-center text-gray-500">
            <li className="mr-2">
              <button
                onClick={() => setActiveTab('attendees')}
                className={`inline-block p-4 rounded-t-lg border-b-2 ${activeTab === 'attendees'
                    ? 'text-blue-600 border-blue-600 active'
                    : 'border-transparent hover:text-gray-600 hover:border-gray-300'
                  }`}
              >
                Attendees & Quorum
              </button>
            </li>
            <li className="mr-2">
              <button
                onClick={() => setActiveTab('voting')}
                className={`inline-block p-4 rounded-t-lg border-b-2 ${activeTab === 'voting'
                    ? 'text-blue-600 border-blue-600 active'
                    : 'border-transparent hover:text-gray-600 hover:border-gray-300'
                  }`}
              >
                Topics & Voting
              </button>
            </li>
          </ul>
        </div>

        <main>
          {activeTab === 'attendees' && <AttendeeList />}
          {activeTab === 'voting' && <VotingPanel />}
        </main>
      </div>
    </div>
  );
}

export default App;
