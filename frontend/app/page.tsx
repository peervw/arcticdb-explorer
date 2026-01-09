"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Database, Loader2 } from "lucide-react";

export default function ConnectPage() {
  const [scheme, setScheme] = useState("lmdb");
  const [path, setPath] = useState("./arctic_db");
  const [awsKey, setAwsKey] = useState("");
  const [awsSecret, setAwsSecret] = useState("");
  const [awsRegion, setAwsRegion] = useState("us-east-1");
  const [loading, setLoading] = useState(false);
  const [showAwsFields, setShowAwsFields] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Clear session when visiting connect page
    api.disconnect();
  }, []);

  useEffect(() => {
    if (scheme === "s3" || scheme === "s3s") {
      setShowAwsFields(true);
      if (path === "./arctic_db") {
        setPath(""); // Clear default local path when switching to S3
      }
    } else {
      setShowAwsFields(false);
      if (path === "") {
        setPath("./arctic_db"); // Restore default when switching back if empty
      }
    }
  }, [scheme]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const uri = `${scheme}://${path}`;
      if (showAwsFields && (!awsKey || !awsSecret)) {
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
            Connect to your ArcticDB instance.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleConnect}>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Connection Path</Label>
                <div className="flex rounded-md shadow-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                  <Select value={scheme} onValueChange={setScheme}>
                    <SelectTrigger className="w-[140px] rounded-r-none border-r-0 focus:ring-0 focus:ring-offset-0 bg-muted/50">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lmdb">lmdb://</SelectItem>
                      <SelectItem value="s3">s3://</SelectItem>
                      <SelectItem value="s3s">s3s://</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    id="path"
                    placeholder={scheme.startsWith('s3') ? "my-bucket" : "./path/to/db"}
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    className="rounded-l-none font-mono focus-visible:ring-0 shadow-none"
                    autoFocus
                  />
                </div>
              </div>
            </div>

            {showAwsFields && (
              <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-4 border-t mt-4">
                <div className="space-y-2">
                  <Label htmlFor="awsKey">AWS Access Key ID</Label>
                  <Input
                    id="awsKey"
                    type="password"
                    placeholder="AKIA..."
                    value={awsKey}
                    onChange={(e) => setAwsKey(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="awsSecret">AWS Secret Access Key</Label>
                  <Input
                    id="awsSecret"
                    type="password"
                    placeholder="Secret..."
                    value={awsSecret}
                    onChange={(e) => setAwsSecret(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="awsRegion">AWS Region</Label>
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
          <CardFooter className="pt-6">
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
