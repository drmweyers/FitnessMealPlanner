import { Button } from "@/components/ui/button";
import type { Recipe } from "@shared/schema";

interface AdminTableProps {
  recipes: Recipe[];
  isLoading: boolean;
  onApprove: (id: string) => void;
  onDelete: (id: string) => void;
  approvePending: boolean;
  deletePending: boolean;
}

export default function AdminTable({ 
  recipes, 
  isLoading, 
  onApprove, 
  onDelete, 
  approvePending, 
  deletePending 
}: AdminTableProps) {
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4 animate-pulse">
              <div className="h-12 w-12 bg-slate-200 rounded-lg"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                <div className="h-3 bg-slate-200 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <div className="p-12 text-center">
        <i className="fas fa-clipboard-check text-4xl text-slate-300 mb-4"></i>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No pending recipes</h3>
        <p className="text-slate-600">All recipes have been reviewed and approved.</p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="w-full min-w-[800px]">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
              Recipe
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
              Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
              Nutrition
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
              Created
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {recipes.map((recipe) => (
            <tr key={recipe.id} className="hover:bg-slate-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <img 
                    className="h-12 w-12 rounded-lg object-cover mr-4" 
                    src={recipe.imageUrl || '/api/placeholder/100/100'} 
                    alt={recipe.name}
                  />
                  <div>
                    <div className="text-sm font-medium text-slate-900">{recipe.name}</div>
                    <div className="text-sm text-slate-500">
                      {recipe.description?.slice(0, 50)}
                      {recipe.description && recipe.description.length > 50 ? '...' : ''}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary/10 text-primary">
                  {recipe.mealTypes[0] || 'N/A'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                <div className="flex space-x-4">
                  <span>{recipe.caloriesKcal} cal</span>
                  <span>{Number(recipe.proteinGrams).toFixed(0)}g protein</span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                {recipe.creationTimestamp 
                  ? new Date(recipe.creationTimestamp).toLocaleDateString()
                  : 'N/A'
                }
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex space-x-2 min-w-[180px]">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onApprove(recipe.id)}
                    disabled={approvePending}
                    className="text-green-600 border-green-200 hover:bg-green-50"
                  >
                    <i className="fas fa-check mr-1"></i>
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDelete(recipe.id)}
                    disabled={deletePending}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <i className="fas fa-times mr-1"></i>
                    Reject
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
