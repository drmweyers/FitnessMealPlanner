import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { RefreshCw, Database, Clock } from 'lucide-react';
import { createCacheManager } from '../lib/cacheUtils';

export default function CacheDebugger() {
  const queryClient = useQueryClient();
  const cacheManager = createCacheManager(queryClient);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [cacheStats, setCacheStats] = useState<any>({});

  useEffect(() => {
    const interval = setInterval(() => {
      // Get current cache state
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();
      
      const stats = {
        totalQueries: queries.length,
        adminQueries: queries.filter(q => String(q.queryKey[0]).includes('/api/admin')).length,
        recipeQueries: queries.filter(q => String(q.queryKey[0]).includes('/api/recipes')).length,
        statsQueries: queries.filter(q => String(q.queryKey[0]).includes('stats')).length,
        lastUpdate: new Date().toLocaleTimeString()
      };
      
      setCacheStats(stats);
    }, 1000);

    return () => clearInterval(interval);
  }, [queryClient]);

  const handleManualRefresh = async () => {
    console.log('🔄 Manual cache refresh triggered');
    await cacheManager.refreshAll();
    setLastRefresh(new Date());
  };

  const handleStatsRefresh = async () => {
    console.log('🔄 Manual stats refresh triggered');
    await cacheManager.invalidateStats();
    setLastRefresh(new Date());
  };

  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <Card className="mb-4 border-dashed border-orange-300 bg-orange-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Database className="h-4 w-4" />
          Cache Debug Info
          <span className="text-xs text-gray-500">(Dev Only)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div>
            <div className="font-medium">Total Queries</div>
            <div className="text-gray-600">{cacheStats.totalQueries}</div>
          </div>
          <div>
            <div className="font-medium">Admin Queries</div>
            <div className="text-gray-600">{cacheStats.adminQueries}</div>
          </div>
          <div>
            <div className="font-medium">Recipe Queries</div>
            <div className="text-gray-600">{cacheStats.recipeQueries}</div>
          </div>
          <div>
            <div className="font-medium">Stats Queries</div>
            <div className="text-gray-600">{cacheStats.statsQueries}</div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock className="h-3 w-3" />
          Last Update: {cacheStats.lastUpdate}
          <span className="mx-2">|</span>
          Manual Refresh: {lastRefresh.toLocaleTimeString()}
        </div>
        
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleStatsRefresh}
            className="text-xs h-7"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh Stats
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleManualRefresh}
            className="text-xs h-7"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh All
          </Button>
        </div>
        
        <div className="text-xs text-gray-500 mt-2">
          💡 Check browser console for cache invalidation logs
        </div>
      </CardContent>
    </Card>
  );
}