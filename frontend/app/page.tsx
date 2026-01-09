"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Database, Loader2 } from "lucide-react";

export default function ConnectPage() {
  const [uri, setUri] = useState("lmdb://./arctic_db");
  const [awsKey, setAwsKey] = useState("");
  const [awsSecret, setAwsSecret] = useState("");
  const [awsRegion, setAwsRegion] = useState("us-east-1");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const isS3 = uri.trim().startsWith("s3://");

  useEffect(() => {
    // Clear session when visiting connect page
    api.disconnect();
  }, []);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isS3 && (!awsKey || !awsSecret)) {
        // Warning validation could go here, but maybe env vars are intended
      }
      await api.connect(uri, awsKey, awsSecret, awsRegion);
      toast.success("Connected to ArcticDB");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-4">
      <Card className="w-full max-w-md shadow-lg border-neutral-200 dark:border-neutral-800">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Database className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-2xl font-bold">ArcticDB Explorer</CardTitle>
          </div>
          <CardDescription>
            Enter your ArcticDB URI to start exploring your data.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleConnect}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="uri">Connection URI</Label>
              <Input
                id="uri"
                placeholder="lmdb://path/to/db or s3://..."
                value={uri}
                onChange={(e) => setUri(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-neutral-500">
                Supports LMDB and S3 backends.
              </p>
            </div>

            {isS3 && (
              <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-4">
                <div className="space-y-2">
                  <Label htmlFor="awsKey">AWS Access Key ID (Optional)</Label>
                  <Input
                    id="awsKey"
                    type="password"
                    placeholder="AKIA..."
                    value={awsKey}
                    onChange={(e) => setAwsKey(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="awsSecret">AWS Secret Access Key (Optional)</Label>
                  <Input
                    id="awsSecret"
                    type="password"
                    placeholder="Secret..."
                    value={awsSecret}
                    onChange={(e) => setAwsSecret(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="awsRegion">AWS Region (Optional)</Label>
                  <Input
                    id="awsRegion"
                    placeholder="us-east-1"
                    value={awsRegion}
                    onChange={(e) => setAwsRegion(e.target.value)}
                  />
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
