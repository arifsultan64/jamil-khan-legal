import React, { useEffect, useState } from 'react';
import { CheckCircle2, Mail, MapPin, Send } from 'lucide-react';
import { usePortal } from '../../contexts/PortalAuthContext';
import { submitContactMessage, trackAnalyticsEvent } from '../../services/firestoreService';
import { usePageSeo } from '../../utils/seo';

export const ContactPage: React.FC = () => {
  const { settings } = usePortal();
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState(''); // Spam trap
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  usePageSeo({
    title: 'Contact | Jameel Khan Legal Research & Publications',
    description: 'Contact Jameel Khan regarding academic inquiries, legal research publications, and seminars.',
    canonicalPath: '/contact',
  });

  useEffect(() => {
    trackAnalyticsEvent({ eventType: 'page_view', title: 'Contact' });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) {
      setStatus('sent');
      return;
    }
    if (senderName.trim().length < 2 || message.trim().length < 10) {
      setErrorMsg('Please provide your name and a message of at least 10 characters.');
      setStatus('error');
      return;
    }
    setStatus('submitting');
    setErrorMsg('');
    try {
      await submitContactMessage({ senderName, senderEmail, subject, message });
      setStatus('sent');
      setSenderName('');
      setSenderEmail('');
      setSubject('');
      setMessage('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not send message.');
      setStatus('error');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="pb-6 border-b border-slate-200 mb-10">
        <p className="text-xs font-mono uppercase tracking-widest text-[#164937] mb-2">Correspondence</p>
        <h1 className="font-serif text-4xl font-bold text-[#0F2342] mb-2">Contact</h1>
        <p className="text-base text-slate-600 max-w-2xl">
          For academic inquiries, seminar invitations, or publication feedback, please use the administrator-approved correspondence channels below.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-md p-6 space-y-5">
            <h2 className="font-serif text-2xl font-bold text-[#0F2342]">Published Details</h2>

            {settings.contactEmail && (
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-[#164937] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">Official Email</p>
                  <a href={`mailto:${settings.contactEmail}`} className="text-sm font-medium text-[#0F2342] hover:underline">
                    {settings.contactEmail}
                  </a>
                </div>
              </div>
            )}

            {settings.contactOffice && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#164937] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">Correspondence Note</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{settings.contactOffice}</p>
                </div>
              </div>
            )}

            {settings.socialLinks && Object.values(settings.socialLinks).some(Boolean) && (
              <div className="pt-4 border-t border-slate-100">
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Verified Profiles</p>
                <div className="flex flex-wrap gap-3 text-sm font-medium">
                  {settings.socialLinks.linkedin && (
                    <a href={settings.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="text-[#0F2342] hover:underline">
                      LinkedIn
                    </a>
                  )}
                  {settings.socialLinks.twitter && (
                    <a href={settings.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-[#0F2342] hover:underline">
                      X / Twitter
                    </a>
                  )}
                  {settings.socialLinks.website && (
                    <a href={settings.socialLinks.website} target="_blank" rel="noopener noreferrer" className="text-[#0F2342] hover:underline">
                      Website
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-[#F4F0E8] border border-slate-200 rounded-md p-5 text-xs text-slate-600 leading-relaxed">
            <strong>Notice:</strong> This is a personal academic and legal research portal. Please do not submit confidential client case files or urgent court filings through this form.
          </div>
        </div>

        <div className="lg:col-span-7">
          {settings.contactFormEnabled ? (
            <div className="bg-white border border-slate-200 rounded-md p-6 sm:p-8">
              <h2 className="font-serif text-2xl font-bold text-[#0F2342] mb-5">Send an Inquiry</h2>
              {status === 'sent' ? (
                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-md flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#164937] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-[#103628]">Message Received</p>
                    <p className="text-sm text-slate-700 mt-1">
                      Your inquiry has been securely recorded for review in the administrator dashboard.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Honeypot anti-spam field */}
                  <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    className="hidden"
                    aria-hidden="true"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="contact-name" className="block text-xs font-medium text-slate-700 mb-1.5">
                        Full Name
                      </label>
                      <input
                        id="contact-name"
                        type="text"
                        required
                        maxLength={120}
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#0F2342]"
                      />
                    </div>
                    <div>
                      <label htmlFor="contact-email" className="block text-xs font-medium text-slate-700 mb-1.5">
                        Email Address
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        required
                        maxLength={200}
                        value={senderEmail}
                        onChange={(e) => setSenderEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#0F2342]"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="contact-subject" className="block text-xs font-medium text-slate-700 mb-1.5">
                      Subject
                    </label>
                    <input
                      id="contact-subject"
                      type="text"
                      required
                      maxLength={200}
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#0F2342]"
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-message" className="block text-xs font-medium text-slate-700 mb-1.5">
                      Message
                    </label>
                    <textarea
                      id="contact-message"
                      required
                      rows={6}
                      maxLength={5000}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#0F2342]"
                    />
                  </div>

                  {status === 'error' && <p className="text-xs text-red-700">{errorMsg}</p>}

                  <button
                    type="submit"
                    disabled={status === 'submitting'}
                    className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-[#0F2342] rounded-md hover:bg-[#18345E] disabled:opacity-60 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    {status === 'submitting' ? 'Sending...' : 'Submit Inquiry'}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-md p-8">
              <p className="text-sm text-slate-600">
                The online contact form is currently disabled by the administrator.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
