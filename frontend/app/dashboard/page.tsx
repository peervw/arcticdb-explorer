"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
    Database,
    Folder,
    FileText,
    LogOut,
    RefreshCw,
    Plus,
    Trash2,
    Upload,
    Save,
    Search,
    History,
    LineChart as ChartIcon
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

interface DataFrameData {
    columns: string[];
    index: any[];
    data: any[][];
}

interface SymbolResponse {
    symbol: string;
    total_rows: number;
    filtered_rows?: number;
    data: DataFrameData;
    version?: number;
}

interface VersionInfo {
    version: number;
    date: string;
    // other metadata...
}

export default function DashboardPage() {
    const router = useRouter();

    // Data State
    const [libraries, setLibraries] = useState<string[]>([]);
    const [selectedLibrary, setSelectedLibrary] = useState<string | null>(null);
    const [symbols, setSymbols] = useState<string[]>([]);
    const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
    const [symbolData, setSymbolData] = useState<SymbolResponse | null>(null);
    const [versions, setVersions] = useState<any[]>([]);

    // UI State
    const [loading, setLoading] = useState(false);
    const [query, setQuery] = useState("");
    const [activeTab, setActiveTab] = useState("data");

    // Management State
    const [newLibName, setNewLibName] = useState("");
    const [isCreateLibOpen, setIsCreateLibOpen] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadSymbolName, setUploadSymbolName] = useState("");
    const [isUploadOpen, setIsUploadOpen] = useState(false);

    // Editing State
    const [localData, setLocalData] = useState<any[][]>([]);
    const [modifiedRows, setModifiedRows] = useState<Set<number>>(new Set());
    const [modifiedRows, setModifiedRows] = useState<Set<number>>(new Set());
    const [isSaving, setIsSaving] = useState(false);

    // Pagination State
    const [page, setPage] = useState(1);
    const pageSize = 100;

    // CSV Download State
    const [isDownloadOpen, setIsDownloadOpen] = useState(false);
    const [downloadType, setDownloadType] = useState<"current" | "all">("current");
    const [isDownloading, setIsDownloading] = useState(false);

    // Initial fetch of libraries
    useEffect(() => {
        const token = localStorage.getItem('arctic_session_token');
        if (!token) {
            router.push('/');
            return;
        }
        fetchLibraries(true);
    }, [router]);

    const fetchLibraries = async (silent: boolean = false) => {
        try {
            const res = await api.getLibraries();
            setLibraries(res.libraries);
            if (!silent) toast.success("Libraries refreshed");
        } catch (err: any) {
            toast.error("Failed to fetch libraries: " + err.message);
        }
    };

    const handleCreateLibrary = async () => {
        if (!newLibName) return;
        try {
            await api.createLibrary(newLibName);
            toast.success(`Library ${newLibName} created`);
            setIsCreateLibOpen(false);
            setNewLibName("");
            fetchLibraries(true);
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleLibraryClick = async (lib: string) => {
        setSelectedLibrary(lib);
        setSelectedSymbol(null);
        setSymbolData(null);
        try {
            const res = await api.getSymbols(lib);
            setSymbols(res.symbols);
        } catch (err: any) {
            toast.error("Failed to fetch symbols: " + err.message);
        }
    };

    const fetchSymbols = async (lib: string) => {
        try {
            const res = await api.getSymbols(lib);
            setSymbols(res.symbols);
        } catch (err: any) {
            console.error(err);
        }
    }

    const handleSymbolClick = async (sym: string, forceQuery?: string, version?: number, newPage: number = 1) => {
        setSelectedSymbol(sym);
        setPage(newPage);
        setLoading(true);
        setModifiedRows(new Set());
        try {
            const offset = (newPage - 1) * pageSize;
            const res = await api.getData(selectedLibrary!, sym, forceQuery ?? query, version, offset);
            setSymbolData(res);
            setLocalData(res.data.data); // Initialize local editable data

            // Fetch versions in background only on first page load or new symbol
            if (newPage === 1) {
                api.getVersions(selectedLibrary!, sym).then(v => setVersions(v.versions)).catch(console.error);
            }

        } catch (err: any) {
            toast.error("Failed to fetch data: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleQuerySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedSymbol) {
            handleSymbolClick(selectedSymbol, query);
        }
    };

    const handleDeleteSymbol = async (sym: string) => {
        if (!selectedLibrary) return;
        try {
            await api.deleteSymbol(selectedLibrary, sym);
            toast.success(`Symbol ${sym} deleted`);
            if (selectedSymbol === sym) {
                setSelectedSymbol(null);
                setSymbolData(null);
            }
            fetchSymbols(selectedLibrary);
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleUpload = async () => {
        if (!selectedLibrary || !uploadFile || !uploadSymbolName) return;
        try {
            await api.uploadSymbol(selectedLibrary, uploadSymbolName, uploadFile);
            toast.success("Uploaded successfully");
            setIsUploadOpen(false);
            setUploadFile(null);
            setUploadSymbolName("");
            fetchSymbols(selectedLibrary);
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleCellEdit = (rowIndex: number, colIndex: number, value: string) => {
        const newData = [...localData];
        newData[rowIndex] = [...newData[rowIndex]];
        newData[rowIndex][colIndex] = value;
        setLocalData(newData);

        const newModified = new Set(modifiedRows);
        newModified.add(rowIndex);
        setModifiedRows(newModified);
    };

    const handleSave = async () => {
        if (!selectedLibrary || !selectedSymbol || !symbolData) return;
        setIsSaving(true);
        try {
            const updates = Array.from(modifiedRows).map(rowIndex => {
                const rowObj: any = {};
                // Add index
                rowObj['index'] = symbolData.data.index[rowIndex];
                // Add columns
                symbolData.data.columns.forEach((col, colIdx) => {
                    rowObj[col] = localData[rowIndex][colIdx];
                });
                return rowObj;
            });

            if (updates.length === 0) return;

            await api.updateData(selectedLibrary, selectedSymbol, updates, 'index');
            toast.success("Saved changes");
            setModifiedRows(new Set());
            // Refresh
            handleSymbolClick(selectedSymbol);
        } catch (err: any) {
            toast.error("Failed to save: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDownloadCSV = () => {
        if (!symbolData) return;

        const headers = ['index', ...symbolData.data.columns];
        const rows = localData.map((row, i) => {
            return [symbolData.data.index[i], ...row];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => {
                const cellStr = String(cell);
                // Escape quotes and wrap in quotes if necessary
                if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                    return `"${cellStr.replace(/"/g, '""')}"`;
                }
                return cellStr;
            }).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${selectedSymbol}_${new Date().toISOString()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Prepare chart data
    const chartData = useMemo(() => {
        if (!symbolData) return [];
        return symbolData.data.index.map((idx, i) => {
            const obj: any = { index: idx };
            symbolData.data.columns.forEach((col, j) => {
                const val = symbolData.data.data[i][j];
                // Try to parse number
                const num = parseFloat(val);
                obj[col] = isNaN(num) ? val : num;
            });
            return obj;
            return obj;
        });
    }, [symbolData]);

    const handleDownloadSubmit = async () => {
        if (!selectedLibrary || !selectedSymbol || !symbolData) return;

        try {
            setIsDownloading(true);
            if (downloadType === "current") {
                handleDownloadCSV(); // existing client-side logic
            } else {
                // Server-side download
                const blob = await api.getCSV(selectedLibrary, selectedSymbol, symbolData.version);
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.setAttribute('href', url);
                link.setAttribute('download', `${selectedSymbol}_full.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            }
            setIsDownloadOpen(false);
            toast.success("Download started");
        } catch (err: any) {
            toast.error("Download failed: " + err.message);
        } finally {
            setIsDownloading(false);
        }
    };

    const handleDisconnect = () => {
        api.disconnect();
        router.push("/");
    };

    return (
        <div className="h-screen w-full flex flex-col bg-background">
            {/* Header */}
            <header className="h-14 border-b flex items-center justify-between px-4 bg-card shrink-0">
                <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-lg">ArcticDB Explorer</span>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsUploadOpen(true)} disabled={!selectedLibrary}>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload CSV
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleDisconnect}>
                        <LogOut className="w-4 h-4 mr-2" />
                        Disconnect
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden flex min-h-0">

                {/* Sidebar: Libraries */}
                <aside className="w-64 border-r flex flex-col bg-card shrink-0">
                    <div className="p-4 font-medium flex justify-between items-center h-[52px] shrink-0">
                        <span>Libraries</span>
                        <div className="flex gap-1">
                            <Dialog open={isCreateLibOpen} onOpenChange={setIsCreateLibOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Create Library</DialogTitle>
                                        <DialogDescription>Enter the name for the new library.</DialogDescription>
                                    </DialogHeader>
                                    <div className="py-2">
                                        <Input
                                            value={newLibName}
                                            onChange={e => setNewLibName(e.target.value)}
                                            placeholder="Library Name"
                                        />
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={handleCreateLibrary}>Create</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                            <Button variant="ghost" size="icon" onClick={() => fetchLibraries(false)} className="h-6 w-6">
                                <RefreshCw className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>
                    <Separator />
                    <ScrollArea className="flex-1">
                        <div className="p-2 space-y-1">
                            {libraries.map((lib) => (
                                <div
                                    key={lib}
                                    onClick={() => handleLibraryClick(lib)}
                                    className={`
                    flex items-center gap-2 p-2 rounded-md cursor-pointer text-sm transition-colors
                    ${selectedLibrary === lib ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:bg-muted"}
                  `}
                                >
                                    <Folder className="w-4 h-4" />
                                    <span className="truncate">{lib}</span>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </aside>

                {/* Sidebar: Symbols */}
                <aside className="w-64 border-r flex flex-col bg-muted/10 shrink-0">
                    <div className="p-4 font-medium text-sm text-muted-foreground h-[52px] flex justify-between items-center shrink-0">
                        <span>{selectedLibrary ? "Symbols" : "Symbols"}</span>
                    </div>
                    <Separator />
                    <ScrollArea className="flex-1">
                        <div className="p-2 space-y-1">
                            {!selectedLibrary && (
                                <div className="p-4 text-sm text-muted-foreground text-center">
                                    Select a library
                                </div>
                            )}
                            {selectedLibrary && symbols.map((sym) => (
                                <div
                                    key={sym}
                                    className={`
                       group flex items-center justify-between p-2 rounded-md cursor-pointer text-sm transition-colors
                       ${selectedSymbol === sym ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent hover:text-accent-foreground"}
                     `}
                                    onClick={() => handleSymbolClick(sym)}
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <FileText className="w-4 h-4 shrink-0" />
                                        <span className="truncate">{sym}</span>
                                    </div>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Trash2 className="h-3 w-3 text-destructive" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete Symbol?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Are you sure you want to delete <b>{sym}</b>? This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteSymbol(sym)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </aside>

                {/* Main View */}
                <main className="flex-1 overflow-hidden flex flex-col min-w-0">
                    <div className="h-full p-6 overflow-hidden flex flex-col">
                        {!selectedSymbol ? (
                            <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-4">
                                <Database className="w-12 h-12 opacity-20" />
                                <p>Select a symbol to view data</p>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col space-y-4">
                                <div className="flex flex-col gap-4 shrink-0">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <h2 className="text-2xl font-bold">{selectedSymbol}</h2>
                                            {symbolData?.version !== undefined && (
                                                <span className="px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground font-mono">v{symbolData.version}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {modifiedRows.size > 0 && (
                                                <Button size="sm" onClick={handleSave} disabled={isSaving}>
                                                    <Save className="w-4 h-4 mr-2" />
                                                    Save Changes
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Query Bar */}
                                    <form onSubmit={handleQuerySubmit} className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Filter data (e.g. `Score > 100`)"
                                                value={query}
                                                onChange={(e) => setQuery(e.target.value)}
                                                className="pl-8"
                                            />
                                        </div>
                                        <Button type="submit" variant="secondary">Run Query</Button>
                                    </form>
                                </div>

                                <span className="text-xs text-muted-foreground">
                                    {symbolData ? `${symbolData.total_rows} total rows` : ''}
                                    {symbolData?.filtered_rows !== undefined && symbolData.filtered_rows !== symbolData.total_rows
                                        ? ` (${symbolData.filtered_rows} matching filter)`
                                        : ''}
                                    {symbolData && ' - Showing top 100'}
                                </span>

                                {loading ? (
                                    <div className="flex-1 flex items-center justify-center">Loading...</div>
                                ) : symbolData ? (
                                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden min-h-0">
                                        <div className="flex items-center justify-between">
                                            <TabsList>
                                                <TabsTrigger value="data" className="gap-2"><Database className="w-4 h-4" /> Data</TabsTrigger>
                                                <TabsTrigger value="charts" className="gap-2"><ChartIcon className="w-4 h-4" /> Chart</TabsTrigger>
                                                <TabsTrigger value="versions" className="gap-2"><History className="w-4 h-4" /> Versions</TabsTrigger>
                                            </TabsList>
                                            <Button variant="outline" size="sm" onClick={() => setIsDownloadOpen(true)}>
                                                <Upload className="w-4 h-4 mr-2 rotate-180" />
                                                Download CSV
                                            </Button>
                                        </div>

                                        <TabsContent value="data" className="flex-1 overflow-auto border rounded-md mt-2 min-h-0 relative flex flex-col">
                                            <div className="flex-1 overflow-auto">
                                                <table className="w-full caption-bottom text-sm">
                                                    <TableHeader className="sticky top-0 z-10 bg-background shadow-sm">
                                                        <TableRow>
                                                            <TableHead className="w-[120px] bg-background sticky top-0 z-20">Index</TableHead>
                                                            {symbolData.data.columns.map((col) => (
                                                                <TableHead key={col} className="bg-background min-w-[100px] sticky top-0 z-20">{col}</TableHead>
                                                            ))}
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {localData.map((row, i) => (
                                                            <TableRow key={i} className={modifiedRows.has(i) ? "bg-yellow-50 dark:bg-yellow-900/20" : ""}>
                                                                <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                                                                    {String(symbolData.data.index[i])}
                                                                </TableCell>
                                                                {row.map((cell, j) => (
                                                                    <TableCell key={j} className="p-0">
                                                                        <div
                                                                            contentEditable
                                                                            suppressContentEditableWarning
                                                                            onBlur={(e) => handleCellEdit(i, j, e.currentTarget.textContent || "")}
                                                                            className="p-4 outline-none focus:bg-accent focus:ring-1 focus:ring-inset ring-primary min-w-[50px] min-h-[40px]"
                                                                        >
                                                                            {String(cell)}
                                                                        </div>
                                                                    </TableCell>
                                                                ))}
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </table>
                                            </div>

                                            {/* Pagination Controls */}
                                            <div className="p-2 border-t flex items-center justify-between bg-card text-sm shrink-0">
                                                <div className="text-muted-foreground">
                                                    Page {page}
                                                    {symbolData.filtered_rows !== undefined && (
                                                        <span> • {Math.min((page - 1) * pageSize + 1, symbolData.filtered_rows)}-{Math.min(page * pageSize, symbolData.filtered_rows)} of {symbolData.filtered_rows}</span>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleSymbolClick(selectedSymbol!, query, symbolData.version, page - 1)}
                                                        disabled={page <= 1 || loading}
                                                    >
                                                        Previous
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleSymbolClick(selectedSymbol!, query, symbolData.version, page + 1)}
                                                        disabled={localData.length < pageSize || (symbolData.filtered_rows !== undefined && page * pageSize >= symbolData.filtered_rows) || loading}
                                                    >
                                                        Next
                                                    </Button>
                                                </div>
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="charts" className="flex-1 overflow-hidden mt-2 min-h-0">
                                            <div className="h-full w-full border rounded-md p-4">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={chartData}>
                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis dataKey="index" tick={{ fontSize: 12 }} />
                                                        <YAxis tick={{ fontSize: 12 }} />
                                                        <Tooltip
                                                            contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
                                                            labelStyle={{ color: 'var(--foreground)' }}
                                                        />
                                                        <Legend />
                                                        {symbolData.data.columns.map((col, idx) => (
                                                            <Line
                                                                key={col}
                                                                type="monotone"
                                                                dataKey={col}
                                                                stroke={`hsl(${idx * 137.508 % 360}, 70%, 50%)`}
                                                                dot={false}
                                                                strokeWidth={2}
                                                            />
                                                        ))}
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="versions" className="flex-1 overflow-auto mt-2 min-h-0">
                                            <div className="space-y-4">
                                                <div className="text-sm font-medium text-muted-foreground">Version History</div>
                                                <ScrollArea className="h-full">
                                                    <div className="space-y-2">
                                                        {versions.map((ver, idx) => (
                                                            <div key={idx} className="flex items-center justify-between p-3 border rounded-md hover:bg-accent cursor-pointer" onClick={() => handleSymbolClick(selectedSymbol, "", ver.version)}>
                                                                <div className="flex flex-col">
                                                                    <span className="font-medium">Version {ver.version}</span>
                                                                    <span className="text-xs text-muted-foreground">{new Date(ver.date).toLocaleString()}</span>
                                                                </div>
                                                                <Button variant="outline" size="sm">
                                                                    Load
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </ScrollArea>
                                            </div>
                                        </TabsContent>
                                    </Tabs>
                                ) : null}
                            </div>
                        )}
                    </div>
                </main>
            </div >

            {/* Upload Dialog */}
            < Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen} >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Upload CSV</DialogTitle>
                        <DialogDescription>Create a new symbol from a CSV file.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Symbol Name</Label>
                            <Input
                                value={uploadSymbolName}
                                onChange={e => setUploadSymbolName(e.target.value)}
                                placeholder="e.g. MyData"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>CSV File</Label>
                            <Input
                                type="file"
                                accept=".csv"
                                onChange={e => setUploadFile(e.target.files?.[0] || null)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleUpload} disabled={!uploadFile || !uploadSymbolName}>Upload</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >
        </div >
    );
}
