
'use client';

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

export default function FirebaseConfigWarning() {
  const isConfigMissing = !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === "your_project_id_here";

  if (!isConfigMissing) {
    return null;
  }

  return (
    <div className="pb-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Firebase Configuration Missing</AlertTitle>
          <AlertDescription>
            Your Firebase environment variables are not set. Please open the <code>.env.local</code> file in your project and add your Firebase project's configuration to it. The app cannot connect to the database until this is resolved.
          </AlertDescription>
        </Alert>
    </div>
  );
}
