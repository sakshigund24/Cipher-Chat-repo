import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore.js";
import { MessageSquare, User, Mail, Lock, Eye, EyeOff, Loader, Check, X } from "lucide-react";
import toast from "react-hot-toast";

// ─── Gmail validator ───────────────────────────────────────
const isValidGmail = (email) => /^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email.trim());

// ─── Password strength rules ───────────────────────────────
const PASSWORD_RULES = [
  { id: "length",    label: "At least 8 characters",        test: (p) => p.length >= 8 },
  { id: "upper",     label: "One uppercase letter (A-Z)",    test: (p) => /[A-Z]/.test(p) },
  { id: "lower",     label: "One lowercase letter (a-z)",    test: (p) => /[a-z]/.test(p) },
  { id: "number",    label: "One number (0-9)",              test: (p) => /[0-9]/.test(p) },
  { id: "special",   label: "One special character (!@#…)",  test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const getStrength = (password) => {
  const passed = PASSWORD_RULES.filter((r) => r.test(password)).length;
  if (passed <= 1) return { level: 0, label: "Very Weak",  color: "bg-error" };
  if (passed === 2) return { level: 1, label: "Weak",       color: "bg-error" };
  if (passed === 3) return { level: 2, label: "Fair",       color: "bg-warning" };
  if (passed === 4) return { level: 3, label: "Strong",     color: "bg-info" };
  return             { level: 4, label: "Very Strong", color: "bg-success" };
};

const PasswordStrengthBar = ({ password }) => {
  if (!password) return null;
  const { level, label, color } = getStrength(password);
  const segments = [0, 1, 2, 3];
  return (
    <div className="mt-2 space-y-2">
      {/* Bar */}
      <div className="flex gap-1">
        {segments.map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300
              ${s <= level ? color : "bg-base-300"}`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${
        level <= 1 ? "text-error" : level === 2 ? "text-warning" : level === 3 ? "text-info" : "text-success"
      }`}>
        {label}
      </p>
      {/* Rules checklist */}
      <ul className="space-y-1">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(password);
          return (
            <li key={rule.id} className={`flex items-center gap-1.5 text-xs ${ok ? "text-success" : "text-base-content/50"}`}>
              {ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const SignUpPage = () => {
  const [formData, setFormData] = useState({ fullName: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const { signup, isSigningUp } = useAuthStore();

  const emailError = emailTouched && formData.email && !isValidGmail(formData.email);
  const allRulesPassed = PASSWORD_RULES.every((r) => r.test(formData.password));

  const validate = () => {
    if (!formData.fullName.trim()) { toast.error("Full name is required"); return false; }
    if (!formData.email.trim())    { toast.error("Email is required"); return false; }
    if (!isValidGmail(formData.email)) { toast.error("Only Gmail addresses are accepted (e.g. you@gmail.com)"); return false; }
    if (!allRulesPassed)           { toast.error("Please meet all password requirements"); return false; }
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) signup(formData);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-base-100 rounded-2xl shadow-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-7 h-7 text-primary" />
              </div>
            </div>
            <h1 className="text-2xl font-bold">Create Account</h1>
            <p className="text-base-content/60 text-sm">Join Cipher Chat today</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="form-control">
              <label className="label"><span className="label-text font-medium">Full Name</span></label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
                <input
                  type="text"
                  placeholder="John Doe"
                  className="input input-bordered w-full pl-10"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Gmail */}
            <div className="form-control">
              <label className="label"><span className="label-text font-medium">Gmail Address</span></label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
                <input
                  type="email"
                  placeholder="you@gmail.com"
                  className={`input input-bordered w-full pl-10 ${emailError ? "input-error" : ""}`}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  onBlur={() => setEmailTouched(true)}
                  required
                />
              </div>
              {emailError && (
                <label className="label">
                  <span className="label-text-alt text-error flex items-center gap-1">
                    <X className="w-3 h-3" /> Only @gmail.com addresses are accepted
                  </span>
                </label>
              )}
            </div>

            {/* Password */}
            <div className="form-control">
              <label className="label"><span className="label-text font-medium">Password</span></label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  className="input input-bordered w-full pl-10 pr-10"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordStrengthBar password={formData.password} />
            </div>

            <button
              type="submit"
              disabled={isSigningUp || !allRulesPassed || !isValidGmail(formData.email)}
              className="btn btn-primary w-full mt-2"
            >
              {isSigningUp ? <Loader className="w-4 h-4 animate-spin" /> : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm text-base-content/60">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;
