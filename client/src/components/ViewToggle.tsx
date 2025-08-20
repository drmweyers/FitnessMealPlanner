import React from "react";
import { Button } from "./ui/button";
import { Grid3X3, Table } from "lucide-react";

export type ViewType = 'cards' | 'table';

interface ViewToggleProps {
  viewType: ViewType;
  onViewTypeChange: (viewType: ViewType) => void;
}

const ViewToggle: React.FC<ViewToggleProps> = ({ viewType, onViewTypeChange }) => {
  React.useEffect(() => {
    // Save preference to localStorage
    localStorage.setItem('admin-recipe-view-type', viewType);
  }, [viewType]);

  return (
    <div className="flex items-center border rounded-lg overflow-hidden">
      <Button
        variant={viewType === 'cards' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewTypeChange('cards')}
        className="rounded-none border-0 px-3 py-2"
      >
        <Grid3X3 className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Cards</span>
      </Button>
      <Button
        variant={viewType === 'table' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewTypeChange('table')}
        className="rounded-none border-0 px-3 py-2"
      >
        <Table className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Table</span>
      </Button>
    </div>
  );
};

export default ViewToggle;