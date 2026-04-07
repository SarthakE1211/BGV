"use client";

import { useState } from "react";
import { Camera, Mail, Phone, MapPin, Globe, Shield, Bell, Key } from "lucide-react";

const tabs = ["Personal Info", "Security", "Notifications", "Integrations"];

export default function ProfilePage() {
    const [activeTab, setActiveTab] = useState("Personal Info");
    const [form, setForm] = useState({
        firstName: "Alex",
        lastName: "Kumar",
        email: "alex.kumar@nexus.io",
        phone: "+91 98765 43210",
        location: "Pune, Maharashtra",
        website: "alexkumar.dev",
        bio: "Full-stack developer and admin of the Nexus workspace. Passionate about clean data pipelines and great UX.",
        role: "Administrator",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

    return (
        <div className="profile-page">
            {/* Header banner */}
            <div className="profile-banner">
                <div className="banner-bg" />
                <div className="profile-meta">
                    <div className="avatar-wrap">
                        <div className="avatar">AK</div>
                        <button className="avatar-edit" title="Change photo">
                            <Camera size={14} />
                        </button>
                    </div>
                    <div className="profile-identity">
                        <h1 className="profile-name">{form.firstName} {form.lastName}</h1>
                        <span className="profile-badge">{form.role}</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs">
                {tabs.map((t) => (
                    <button
                        key={t}
                        className={`tab-btn ${activeTab === t ? "active" : ""}`}
                        onClick={() => setActiveTab(t)}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {activeTab === "Personal Info" && (
                <div className="tab-content">
                    <div className="form-grid">
                        <div className="form-group">
                            <label>First Name</label>
                            <input name="firstName" value={form.firstName} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Last Name</label>
                            <input name="lastName" value={form.lastName} onChange={handleChange} />
                        </div>
                        <div className="form-group icon-field">
                            <label>Email</label>
                            <Mail size={15} className="field-icon" />
                            <input name="email" value={form.email} onChange={handleChange} />
                        </div>
                        <div className="form-group icon-field">
                            <label>Phone</label>
                            <Phone size={15} className="field-icon" />
                            <input name="phone" value={form.phone} onChange={handleChange} />
                        </div>
                        <div className="form-group icon-field">
                            <label>Location</label>
                            <MapPin size={15} className="field-icon" />
                            <input name="location" value={form.location} onChange={handleChange} />
                        </div>
                        <div className="form-group icon-field">
                            <label>Website</label>
                            <Globe size={15} className="field-icon" />
                            <input name="website" value={form.website} onChange={handleChange} />
                        </div>
                        <div className="form-group full-width">
                            <label>Bio</label>
                            <textarea name="bio" rows={3} value={form.bio} onChange={handleChange} />
                        </div>
                    </div>
                    <div className="form-actions">
                        <button className="btn-secondary">Discard</button>
                        <button className="btn-primary">Save Changes</button>
                    </div>
                </div>
            )}

            {activeTab === "Security" && (
                <div className="tab-content">
                    <div className="section-card">
                        <div className="section-icon-wrap" style={{ background: "rgba(108,99,255,0.12)", color: "#6c63ff" }}>
                            <Key size={20} />
                        </div>
                        <div>
                            <h3 className="section-title">Change Password</h3>
                            <p className="section-desc">Last changed 3 months ago.</p>
                        </div>
                        <button className="btn-secondary ml-auto">Update</button>
                    </div>
                    <div className="section-card">
                        <div className="section-icon-wrap" style={{ background: "rgba(16,217,160,0.12)", color: "#10d9a0" }}>
                            <Shield size={20} />
                        </div>
                        <div>
                            <h3 className="section-title">Two-Factor Authentication</h3>
                            <p className="section-desc">Currently <strong>disabled</strong>. Enable for extra security.</p>
                        </div>
                        <button className="btn-primary ml-auto">Enable 2FA</button>
                    </div>
                </div>
            )}

            {activeTab === "Notifications" && (
                <div className="tab-content">
                    {[
                        { label: "Email notifications", desc: "Receive updates via email", on: true },
                        { label: "Push notifications", desc: "Browser push alerts", on: false },
                        { label: "Weekly digest", desc: "Summary every Monday", on: true },
                        { label: "Security alerts", desc: "Login & access warnings", on: true },
                    ].map(({ label, desc, on }) => (
                        <div className="section-card" key={label}>
                            <div className="section-icon-wrap" style={{ background: "rgba(249,168,37,0.12)", color: "#f9a825" }}>
                                <Bell size={18} />
                            </div>
                            <div>
                                <h3 className="section-title">{label}</h3>
                                <p className="section-desc">{desc}</p>
                            </div>
                            <label className="toggle ml-auto">
                                <input type="checkbox" defaultChecked={on} />
                                <span className="toggle-track" />
                            </label>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === "Integrations" && (
                <div className="tab-content">
                    {[
                        { name: "GitHub", status: "Connected", color: "#6c63ff" },
                        { name: "Slack", status: "Connected", color: "#10d9a0" },
                        { name: "Jira", status: "Not connected", color: "#7a7f96" },
                        { name: "Figma", status: "Not connected", color: "#7a7f96" },
                    ].map(({ name, status, color }) => (
                        <div className="section-card" key={name}>
                            <div className="integ-badge" style={{ background: color + "22", color }}>{name[0]}</div>
                            <div>
                                <h3 className="section-title">{name}</h3>
                                <p className="section-desc" style={{ color }}>{status}</p>
                            </div>
                            <button className={`${status === "Connected" ? "btn-danger" : "btn-primary"} ml-auto`}>
                                {status === "Connected" ? "Disconnect" : "Connect"}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700&family=DM+Sans:wght@300;400;500&display=swap');

        :root {
          --accent: #6c63ff; --accent2: #ff6b6b;
          --surface: #1a1e2a; --border: #252a38;
          --text: #e8eaf0; --text-muted: #7a7f96;
          --bg: #0d0f14;
        }

        .profile-page { display: flex; flex-direction: column; gap: 0; animation: fadeIn 0.4s ease; }

        /* Banner */
        .profile-banner {
          position: relative; border-radius: 14px; overflow: hidden;
          background: var(--surface); border: 1px solid var(--border);
          padding: 1.5rem 1.75rem 1.25rem; margin-bottom: 1.25rem;
        }
        .banner-bg {
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(108,99,255,0.18) 0%, transparent 60%);
          pointer-events: none;
        }
        .profile-meta { display: flex; align-items: center; gap: 1.25rem; position: relative; }
        .avatar-wrap { position: relative; flex-shrink: 0; }
        .avatar {
          width: 72px; height: 72px; border-radius: 50%;
          background: linear-gradient(135deg, var(--accent), var(--accent2));
          display: flex; align-items: center; justify-content: center;
          font-family: 'Syne', sans-serif; font-size: 1.4rem; font-weight: 700; color: #fff;
          border: 3px solid var(--bg);
        }
        .avatar-edit {
          position: absolute; bottom: 0; right: 0;
          width: 24px; height: 24px; border-radius: 50%;
          background: var(--accent); border: 2px solid var(--bg);
          display: flex; align-items: center; justify-content: center;
          color: #fff; cursor: pointer;
        }
        .profile-identity { display: flex; flex-direction: column; gap: 0.4rem; }
        .profile-name { font-family: 'Syne', sans-serif; font-size: 1.5rem; font-weight: 700; color: var(--text); }
        .profile-badge {
          display: inline-block; padding: 3px 10px;
          background: rgba(108,99,255,0.15); color: var(--accent);
          border-radius: 20px; font-size: 0.75rem; font-weight: 500;
        }

        /* Tabs */
        .tabs {
          display: flex; gap: 0; border-bottom: 1px solid var(--border);
          margin-bottom: 1.5rem;
        }
        .tab-btn {
          background: none; border: none; color: var(--text-muted);
          padding: 0.75rem 1.25rem; font-size: 0.875rem;
          cursor: pointer; font-family: inherit; position: relative;
          transition: color 0.18s;
        }
        .tab-btn:hover { color: var(--text); }
        .tab-btn.active { color: var(--accent); }
        .tab-btn.active::after {
          content: ''; position: absolute; bottom: -1px; left: 0; right: 0;
          height: 2px; background: var(--accent); border-radius: 2px 2px 0 0;
        }

        /* Form */
        .tab-content { display: flex; flex-direction: column; gap: 1rem; }
        .form-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 12px; padding: 1.5rem;
        }
        .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
        .form-group.full-width { grid-column: 1 / -1; }
        .form-group.icon-field { position: relative; }
        .field-icon {
          position: absolute; left: 10px; bottom: 11px;
          color: var(--text-muted); pointer-events: none;
        }
        label { font-size: 0.78rem; color: var(--text-muted); font-weight: 500; }
        input, textarea {
          background: var(--bg); border: 1px solid var(--border);
          border-radius: 8px; color: var(--text); font-family: inherit;
          font-size: 0.875rem; padding: 0.6rem 0.75rem;
          transition: border-color 0.18s; outline: none; resize: none;
        }
        .icon-field input { padding-left: 2rem; }
        input:focus, textarea:focus { border-color: var(--accent); }

        .form-actions {
          display: flex; justify-content: flex-end; gap: 0.75rem;
          padding-top: 0.25rem;
        }

        /* Section cards */
        .section-card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 12px; padding: 1.25rem 1.5rem;
          display: flex; align-items: center; gap: 1rem;
        }
        .section-icon-wrap {
          width: 42px; height: 42px; border-radius: 10px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .integ-badge {
          width: 42px; height: 42px; border-radius: 10px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Syne', sans-serif; font-size: 1.1rem; font-weight: 700;
        }
        .section-title { font-size: 0.9rem; font-weight: 500; color: var(--text); }
        .section-desc { font-size: 0.8rem; color: var(--text-muted); margin-top: 2px; }
        .ml-auto { margin-left: auto; }

        /* Buttons */
        .btn-primary {
          background: var(--accent); color: #fff; border: none;
          padding: 0.55rem 1.1rem; border-radius: 8px; font-size: 0.82rem;
          font-weight: 500; cursor: pointer; font-family: inherit; white-space: nowrap;
          transition: opacity 0.18s;
        }
        .btn-primary:hover { opacity: 0.85; }
        .btn-secondary {
          background: var(--surface); color: var(--text);
          border: 1px solid var(--border);
          padding: 0.55rem 1.1rem; border-radius: 8px; font-size: 0.82rem;
          font-weight: 500; cursor: pointer; font-family: inherit; white-space: nowrap;
          transition: border-color 0.18s;
        }
        .btn-secondary:hover { border-color: var(--accent); }
        .btn-danger {
          background: rgba(255,107,107,0.12); color: var(--accent2);
          border: 1px solid rgba(255,107,107,0.3);
          padding: 0.55rem 1.1rem; border-radius: 8px; font-size: 0.82rem;
          font-weight: 500; cursor: pointer; font-family: inherit; white-space: nowrap;
        }

        /* Toggle */
        .toggle { position: relative; cursor: pointer; }
        .toggle input { position: absolute; opacity: 0; width: 0; height: 0; }
        .toggle-track {
          display: block; width: 40px; height: 22px; border-radius: 11px;
          background: var(--border); transition: background 0.2s;
        }
        .toggle-track::after {
          content: ''; position: absolute;
          top: 3px; left: 3px;
          width: 16px; height: 16px; border-radius: 50%;
          background: #fff; transition: transform 0.2s;
        }
        .toggle input:checked + .toggle-track { background: var(--accent); }
        .toggle input:checked + .toggle-track::after { transform: translateX(18px); }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
        </div>
    );
}