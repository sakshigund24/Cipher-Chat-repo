import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore.js";
import { MessageSquare, Mail, Lock, Eye, EyeOff, Loader, X } from "lucide-react";
import toast from "react-hot-toast";

const isValidGmail = (email) => /^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email.trim());

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const { login, isLoggingIn } = useAuthStore();

  const emailError = emailTouched && formData.email && !isValidGmail(formData.email);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValidGmail(formData.email)) {
      toast.error("Only Gmail addresses are accepted");
      return;
    }
    login(formData);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 px-4">
      <div className="w-full max-w-md">
        <div className="bg-base-100 rounded-2xl shadow-xl p-8 space-y-6">
          {/* Logo */}
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-7 h-7 text-primary" />
              </div>
            </div>
            <h1 className="text-2xl font-bold">Welcome Back</h1>
            <p className="text-base-content/60 text-sm">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Gmail */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Gmail Address</span>
              </label>
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
              <label className="label">
                <span className="label-text font-medium">Password</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="input input-bordered w-full pl-10 pr-10"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoggingIn} className="btn btn-primary w-full">
              {isLoggingIn ? <Loader className="w-4 h-4 animate-spin" /> : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm text-base-content/60">
            Don&apos;t have an account?{" "}
            <Link to="/signup" className="text-primary font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
