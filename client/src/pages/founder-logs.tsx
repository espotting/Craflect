import { useState } from 'react';
import { DashboardLayout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Download, AlertCircle, Info, AlertTriangle, CheckCircle } from 'lucide-react';

const mockLogs = [
  { id: 1, timestamp: '2024-06-15 14:32:18', level: 'info', message: 'User login successful', user: 'alice@example.com', source: 'auth' },
  { id: 2, timestamp: '2024-06-15 14:30:45', level: 'warning', message: 'API rate limit approaching', user: 'system', source: 'api' },
  { id: 3, timestamp: '2024-06-15 14:28:12', level: 'error', message: 'Video classification failed', user: 'bob@example.com', source: 'engine' },
  { id: 4, timestamp: '2024-06-15 14:25:33', level: 'info', message: 'New subscription created', user: 'carla@example.com', source: 'billing' },
  { id: 5, timestamp: '2024-06-15 14:20:01', level: 'info', message: 'Dataset ingestion completed', user: 'system', source: 'engine' },
  { id: 6, timestamp: '2024-06-15 14:15:22', level: 'success', message: 'Payment processed', user: 'emma@example.com', source: 'billing' },
  { id: 7, timestamp: '2024-06-15 14:10:55', level: 'warning', message: 'High memory usage detected', user: 'system', source: 'system' },
  { id: 8, timestamp: '2024-06-15 14:05:18', level: 'info', message: 'User profile updated', user: 'grace@example.com', source: 'auth' },
  { id: 9, timestamp: '2024-06-15 14:00:00', level: 'info', message: 'Daily report generated', user: 'system', source: 'system' },
  { id: 10, timestamp: '2024-06-15 13:55:42', level: 'error', message: 'Database connection timeout', user: 'system', source: 'database' },
];

const levelColors: Record<string, string> = {
  info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  error: 'bg-red-500/20 text-red-400 border-red-500/30',
  success: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

const levelIcons: Record<string, React.ReactNode> = {
  info: <Info className="w-4 h-4 text-blue-400" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-400" />,
  error: <AlertCircle className="w-4 h-4 text-red-400" />,
  success: <CheckCircle className="w-4 h-4 text-emerald-400" />,
};

export default function FounderLogs() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !(user as any)?.isAdmin) {
      setLocation("/home");
    }
  }, [authLoading, user, setLocation]);

  if (authLoading || !(user as any)?.isAdmin) return null;

  const filteredLogs = mockLogs.filter((log) => {
    const matchesSearch =
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.source.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = levelFilter ? log.level === levelFilter : true;
    return matchesSearch && matchesLevel;
  });

  const errorCount = mockLogs.filter((l) => l.level === 'error').length;
  const warningCount = mockLogs.filter((l) => l.level === 'warning').length;

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="page-founder-logs">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-logs-title">System Logs</h1>
            <p className="text-sm text-muted-foreground mt-1">Monitor platform activity and issues</p>
          </div>
          <div className="flex items-center gap-4">
            {errorCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 rounded-lg border border-red-500/20">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-sm font-medium text-red-400">{errorCount} errors</span>
              </div>
            )}
            {warningCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-amber-400">{warningCount} warnings</span>
              </div>
            )}
            <Button variant="outline" size="sm" className="border-border text-muted-foreground" data-testid="button-export-logs">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background border-border"
                data-testid="input-search-logs"
              />
            </div>
            <Button variant={!levelFilter ? "default" : "outline"} size="sm" onClick={() => setLevelFilter(null)} className={!levelFilter ? "bg-primary" : "border-border text-muted-foreground"}>All</Button>
            <Button variant={levelFilter === 'info' ? "default" : "outline"} size="sm" onClick={() => setLevelFilter('info')} className={levelFilter === 'info' ? "bg-blue-600" : "border-border text-muted-foreground"}>Info</Button>
            <Button variant={levelFilter === 'warning' ? "default" : "outline"} size="sm" onClick={() => setLevelFilter('warning')} className={levelFilter === 'warning' ? "bg-amber-600" : "border-border text-muted-foreground"}>Warning</Button>
            <Button variant={levelFilter === 'error' ? "default" : "outline"} size="sm" onClick={() => setLevelFilter('error')} className={levelFilter === 'error' ? "bg-red-600" : "border-border text-muted-foreground"}>Error</Button>
            <Button variant={levelFilter === 'success' ? "default" : "outline"} size="sm" onClick={() => setLevelFilter('success')} className={levelFilter === 'success' ? "bg-emerald-600" : "border-border text-muted-foreground"}>Success</Button>
          </div>
        </Card>

        <Card className="bg-card border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Timestamp</TableHead>
                <TableHead className="text-muted-foreground">Level</TableHead>
                <TableHead className="text-muted-foreground">Message</TableHead>
                <TableHead className="text-muted-foreground">User</TableHead>
                <TableHead className="text-muted-foreground">Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id} className="border-border" data-testid={`row-log-${log.id}`}>
                  <TableCell className="text-muted-foreground font-mono text-sm">{log.timestamp}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {levelIcons[log.level]}
                      <Badge variant="outline" className={levelColors[log.level]}>{log.level}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-foreground">{log.message}</TableCell>
                  <TableCell className="text-muted-foreground">{log.user}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">{log.source}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Showing {filteredLogs.length} of {mockLogs.length} logs</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled className="border-border">Previous</Button>
            <Button variant="outline" size="sm" className="border-border">Next</Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
