import { useState, useEffect } from "react";
import { redirect, useActionData, useNavigation, Form, useNavigate } from "react-router";
import { setTokens } from "~/auth/auth-server";
import { Resource } from "sst";

export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  
  if (intent === "send-code") {
    const email = formData.get("email") as string;
    if (!email) {
      return { error: "Email is required" };
    }
    
    try {
      // Get the auth backend URL from SST resource
      const authUrl = Resource.AuthFunction.url.replace(/\/$/, ''); // Remove trailing slash
      console.log("Auth URL:", authUrl);
      const response = await fetch(`${authUrl}/code/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });
      
      console.log("Response status:", response.status, response.statusText);
      console.log("Response headers:", Object.fromEntries(response.headers.entries()));
      
      const responseText = await response.text();
      console.log("Raw response body:", responseText);
      console.log("Response body length:", responseText.length);
      console.log("First 50 chars:", responseText.substring(0, 50));
      
      if (!response.ok) {
        try {
          const errorData = JSON.parse(responseText);
          return { error: errorData.message || "Failed to send verification code" };
        } catch (e) {
          return { error: `Server error: ${response.status} ${response.statusText}` };
        }
      }
      
      try {
        const responseData = JSON.parse(responseText);
        console.log("Success response:", responseData);
        return { success: "Verification code sent to your email", email };
      } catch (e) {
        console.error("JSON parse error:", e);
        console.error("Response text was:", responseText);
        return { error: "Invalid response from server" };
      }
    } catch (error) {
      console.error("Send code error:", error);
      return { error: "Failed to send verification code" };
    }
  } else if (intent === "verify-code") {
    const email = formData.get("email") as string;
    const code = formData.get("code") as string;
    
    console.log("Verify code - email:", email, "code:", code);
    
    if (!email || !code) {
      return { error: "Email and code are required" };
    }
    
    try {
      // Get the auth backend URL from SST resource
      const authUrl = Resource.AuthFunction.url.replace(/\/$/, ''); // Remove trailing slash
      const response = await fetch(`${authUrl}/code/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, code }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return { error: errorData.message || "Invalid verification code" };
      }
      
      const { access_token } = await response.json();
      
      // Set the token as a cookie and redirect
      const headers = await setTokens(access_token);
      
      throw redirect("/", { headers });
    } catch (error) {
      if (error instanceof Response) {
        throw error; // This is our redirect response
      }
      console.error("Login action error:", error);
      return { error: "Failed to verify code" };
    }
  }
  
  return { error: "Invalid action" };
}

export default function LoginPage() {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const actionData = useActionData();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const isSubmitting = navigation.state === "submitting";

  // Use email from action data if available (when code was sent successfully)
  const currentEmail = actionData?.email || email;

  // Auto-advance to code step when code is sent successfully
  useEffect(() => {
    if (actionData?.success && step === "email") {
      setStep("code");
    }
  }, [actionData]);
  
  // Also store email when moving to code step
  useEffect(() => {
    if (actionData?.email && !email) {
      setEmail(actionData.email);
    }
  }, [actionData?.email]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          {step === "email" ? (
            <p className="mt-2 text-center text-sm text-gray-600">
              Enter your email to receive a verification code
            </p>
          ) : (
            <p className="mt-2 text-center text-sm text-gray-600">
              Enter the verification code sent to {currentEmail}
            </p>
          )}
        </div>

        {actionData?.error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{actionData.error}</div>
          </div>
        )}


        {step === "email" ? (
          <Form method="post" className="mt-8 space-y-6">
            <input type="hidden" name="intent" value="send-code" />
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Email address"
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </div>
                ) : (
                  "Send Verification Code"
                )}
              </button>
            </div>
          </Form>
        ) : (
          <div className="mt-8 space-y-6">
            <Form method="post" className="space-y-6">
              <input type="hidden" name="intent" value="verify-code" />
              <input type="hidden" name="email" value={currentEmail} />
              <div>
                <label htmlFor="code" className="sr-only">
                  Verification code
                </label>
                <input
                  id="code"
                  name="code"
                  type="text"
                  required
                  disabled={isSubmitting}
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Enter verification code"
                />
              </div>
              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Verifying...
                    </div>
                  ) : (
                    "Verify Code"
                  )}
                </button>
              </div>
            </Form>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                // Navigate to clear action data
                navigate(".", { replace: true });
              }}
              className="w-full text-center text-sm text-indigo-600 hover:text-indigo-500"
            >
              Back to email entry
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 