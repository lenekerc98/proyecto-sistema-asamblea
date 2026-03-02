import { useState, useEffect } from 'react';

export default function AttendeeList() {
    const [attendees, setAttendees] = useState([]);
    const [quorum, setQuorum] = useState({ total_shares: 0, total_percentage: 0 });

    useEffect(() => {
        fetchAttendees();
        fetchQuorum();
    }, []);

    const fetchAttendees = async () => {
        try {
            const res = await fetch('http://localhost:3000/api/attendees');
            const data = await res.json();
            setAttendees(data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchQuorum = async () => {
        try {
            const res = await fetch('http://localhost:3000/api/attendees/quorum');
            const data = await res.json();
            setQuorum(data);
        } catch (err) {
            console.error(err);
        }
    };

    const toggleCheckIn = async (id, currentStatus) => {
        try {
            await fetch(`http://localhost:3000/api/attendees/${id}/checkin`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ attended: !currentStatus }),
            });
            fetchAttendees();
            fetchQuorum();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="p-4 bg-white shadow rounded-lg">
            <h2 className="text-xl font-bold mb-4">Attendees</h2>
            <div className="mb-4 p-2 bg-blue-100 rounded">
                <strong>Quorum:</strong> {quorum.total_shares} Shares ({Number(quorum.total_percentage).toFixed(3)}%)
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full leading-normal">
                    <thead>
                        <tr>
                            <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Name
                            </th>
                            <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                ID
                            </th>
                            <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Shares
                            </th>
                            <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Check-in
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {attendees.map((attendee) => (
                            <tr key={attendee.id}>
                                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <p className="text-gray-900 whitespace-no-wrap">{attendee.name}</p>
                                </td>
                                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <p className="text-gray-900 whitespace-no-wrap">{attendee.identification}</p>
                                </td>
                                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <p className="text-gray-900 whitespace-no-wrap">{attendee.shares}</p>
                                </td>
                                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <button
                                        onClick={() => toggleCheckIn(attendee.id, attendee.attended)}
                                        className={`px-3 py-1 rounded text-white ${attendee.attended ? 'bg-green-500' : 'bg-gray-400'}`}
                                    >
                                        {attendee.attended ? 'Present' : 'Absent'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
