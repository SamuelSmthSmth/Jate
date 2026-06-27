import React from 'react';
import { Job, Status } from './JobCard';
import { MapPin, Calendar, Clock, DollarSign, Text } from 'lucide-react';

type ShareCardTemplateProps = {
  job: any; // We'll pass the full job object
  statusColors: Record<string, string>;
  getAvatarColor: (name: string) => string;
  getDomain: (url?: string) => string;
  logoError: boolean;
  setLogoError: (err: boolean) => void;
};

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : "59, 130, 246";
}

function fmt(d?: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export const ShareCardTemplate = React.forwardRef<HTMLDivElement, ShareCardTemplateProps>(
  ({ job, statusColors, getAvatarColor, getDomain, logoError, setLogoError }, ref) => {
    const companyStr = job.company || "Unknown";
    const roleStr = job.role || job.title || "No Role";
    const deadlineStr = job.deadline || job.deadlines?.signup;
    const displayStatus = job.status as Status;
    const bgHex = statusColors[displayStatus] || '#3b82f6';
    
    return (
      <div 
        ref={ref}
        className="w-[600px] h-[600px] bg-background text-foreground flex flex-col p-8 overflow-hidden relative border border-border/20 rounded-xl"
        style={{ fontFamily: "'Inter', sans-serif", backgroundColor: '#09090b', color: '#f8fafc' }}
      >
        {/* Subtle background glow based on status color */}
        <div 
          className="absolute inset-0 opacity-10 blur-3xl pointer-events-none"
          style={{ backgroundColor: bgHex }}
        />

        {/* Header: Avatar, Company, Role */}
        <div className="flex items-center gap-6 mt-4 z-10">
          <div className={`w-24 h-24 rounded-2xl flex items-center justify-center text-4xl font-bold overflow-hidden border-2 border-border/50 shrink-0 ${getAvatarColor(companyStr)}`}>
            {(() => {
              const domain = getDomain(job.url || job.postingUrl || job.portalUrl);
              if (domain && !logoError) {
                return (
                  <img 
                    src={`https://logo.clearbit.com/${domain}`} 
                    alt={companyStr}
                    onError={() => setLogoError(true)}
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous" // Important for html-to-image
                  />
                );
              }
              return companyStr[0].toUpperCase();
            })()}
          </div>
          <div className="flex flex-col flex-1">
            <h1 className="text-3xl font-bold tracking-tight text-white mb-1">{companyStr}</h1>
            <h2 className="text-xl text-white/70 font-medium">{roleStr}</h2>
          </div>
        </div>

        {/* Status Badge */}
        <div className="mt-8 z-10">
           <span
              className="text-sm px-4 py-1.5 rounded-full font-semibold border"
              style={{ 
                fontFamily: "'Geist Mono', monospace", 
                backgroundColor: `rgba(${hexToRgb(bgHex)}, 0.15)`,
                color: bgHex,
                borderColor: `rgba(${hexToRgb(bgHex)}, 0.3)`
              }}
            >
              {displayStatus.toUpperCase()}
            </span>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-y-6 gap-x-8 mt-10 z-10 w-full">
          {job.location && (
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-white/50 shrink-0" />
              <div>
                <p className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1">Location</p>
                <p className="text-base text-white/90 font-medium">{job.location}</p>
              </div>
            </div>
          )}
          
          {(job.salary || job.salaryType) && (
            <div className="flex items-start gap-3">
              <DollarSign className="w-5 h-5 text-white/50 shrink-0" />
              <div>
                <p className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1">Compensation</p>
                <p className="text-base text-white/90 font-medium">
                  {job.salary ? job.salary : (job.salaryType === "Paid" ? "Paid Position" : "Volunteer")}
                </p>
              </div>
            </div>
          )}

          {job.appliedDate && (
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-white/50 shrink-0" />
              <div>
                <p className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1">Applied</p>
                <p className="text-base text-white/90 font-medium">{fmt(job.appliedDate)}</p>
              </div>
            </div>
          )}

          {deadlineStr && (
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-white/50 shrink-0" />
              <div>
                <p className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1">Deadline</p>
                <p className="text-base text-white/90 font-medium">{fmt(deadlineStr)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Notes Preview */}
        {job.notes && (
          <div className="mt-8 z-10 flex-1 border-t border-white/10 pt-6">
            <div className="flex items-center gap-2 text-white/50 mb-2">
              <Text className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Notes</span>
            </div>
            <p className="text-sm text-white/70 leading-relaxed line-clamp-4">
              {job.notes}
            </p>
          </div>
        )}

        {/* Footer Brand */}
        <div className="absolute bottom-6 right-8 opacity-40 flex items-center gap-2">
          <div className="w-5 h-5 bg-[#22c55e] rounded-md flex items-center justify-center">
            <span className="text-[10px] font-bold text-black font-mono">J</span>
          </div>
          <span className="text-sm font-bold tracking-widest text-white">JATE</span>
        </div>
      </div>
    );
  }
);
