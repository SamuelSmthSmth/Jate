// src/components/JobCard.jsx
import React, { useState } from "react";

export default function JobCard({ job, updateJob, deleteJob }) {
  // Toggle for the accordion expansion
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Local state for the form so we don't save to the database on every single keystroke
  const [formData, setFormData] = useState({
    status: job.status || "Waiting",
    isPaid: job.isPaid || false,
    salary: job.salary || "",
    signupDate: job.deadlines?.signup || "",
    interviewDate: job.deadlines?.interview || "",
    url: job.url || "",
    notes: job.notes || ""
  });

  // Handle local input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  // Save changes to Firebase
  const handleSave = () => {
    updateJob(job.id, {
      status: formData.status,
      isPaid: formData.isPaid,
      salary: Number(formData.salary),
      url: formData.url,
      notes: formData.notes,
      deadlines: {
        signup: formData.signupDate,
        interview: formData.interviewDate
      }
    });
    setIsExpanded(false); // Close the card after saving
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 mb-4 shadow-sm bg-white">
      {/* Top Level - Always Visible */}
      <div 
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <h3 className="text-lg font-bold">{job.title}</h3>
          <p className="text-gray-600">{job.company}</p>
        </div>
        <div className="flex gap-3 items-center">
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
            {formData.status}
          </span>
          <span>{isExpanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* Expanded Accordion Area */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-4">
          
          <div className="flex gap-4">
            {/* Status Dropdown */}
            <div className="flex flex-col">
              <label className="text-sm text-gray-500">Status</label>
              <select name="status" value={formData.status} onChange={handleChange} className="border p-2 rounded">
                <option value="Waiting">Waiting</option>
                <option value="Applied">Applied</option>
                <option value="Online Assessment">Online Assessment</option>
                <option value="Interviewing">Interviewing</option>
                <option value="Rejected">Rejected</option>
                <option value="Accepted">Accepted</option>
              </select>
            </div>

            {/* Application Deadline */}
            <div className="flex flex-col">
              <label className="text-sm text-gray-500">Sign-up Deadline</label>
              <input type="date" name="signupDate" value={formData.signupDate} onChange={handleChange} className="border p-2 rounded" />
            </div>

            {/* Dynamic Interview Date (Only shows if interviewing or accepted) */}
            {(formData.status === "Interviewing" || formData.status === "Accepted") && (
              <div className="flex flex-col">
                <label className="text-sm text-blue-500 font-bold">Interview Date</label>
                <input type="date" name="interviewDate" value={formData.interviewDate} onChange={handleChange} className="border p-2 rounded border-blue-300" />
              </div>
            )}
          </div>

          {/* Salary & Money Section */}
          <div className="flex gap-4 items-center bg-gray-50 p-3 rounded">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="isPaid" checked={formData.isPaid} onChange={handleChange} />
              <span className="text-sm font-medium">This is a Paid Role</span>
            </label>
            
            {formData.isPaid && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500">$</span>
                <input type="number" name="salary" placeholder="Amount per year" value={formData.salary} onChange={handleChange} className="border p-2 rounded w-32" />
              </div>
            )}
          </div>

          {/* Links and Notes */}
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-500">Job Posting URL</label>
            <input type="url" name="url" placeholder="https://..." value={formData.url} onChange={handleChange} className="border p-2 rounded" />
            
            <label className="text-sm text-gray-500 mt-2">Notes</label>
            <textarea name="notes" placeholder="Salary ranges, interviewer names, etc." value={formData.notes} onChange={handleChange} className="border p-2 rounded h-24" />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-2">
            <button onClick={() => deleteJob(job.id)} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded">Delete</button>
            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save Changes</button>
          </div>
        </div>
      )}
    </div>
  );
}