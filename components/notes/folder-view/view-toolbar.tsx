"use client";

import { useState } from "react";
import {
  Table,
  LayoutGrid,
  Columns,
  SortAsc,
  SortDesc,
  Filter,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ViewConfig, FilterRule, SortField, SortRule, ViewType, GroupByField, getLabelColor } from "@/lib/notes/types";
import { cn } from "@/lib/utils";
import { TemplateSelector } from "./template-selector";

interface ViewToolbarProps {
  viewType: ViewType;
  config: ViewConfig;
  allLabels: string[];
  onViewTypeChange: (viewType: ViewType) => void;
  onConfigChange: (config: ViewConfig) => void;
  folderId?: string;
  onManageTemplates?: () => void;
}

const VIEW_TYPES: { type: ViewType; icon: typeof Table; label: string }[] = [
  { type: "database", icon: Table, label: "Table" },
  { type: "gallery", icon: LayoutGrid, label: "Gallery" },
  { type: "kanban", icon: Columns, label: "Board" },
];

const SORT_FIELDS: { field: SortField; label: string }[] = [
  { field: "updated_at", label: "Last Updated" },
  { field: "created_at", label: "Created" },
  { field: "title", label: "Title" },
  { field: "note_type", label: "Type" },
  { field: "is_starred", label: "Starred" },
];

const GROUP_BY_OPTIONS: { field: GroupByField; label: string }[] = [
  { field: null, label: "None" },
  { field: "tags", label: "Label" },
  { field: "note_type", label: "Type" },
  { field: "is_starred", label: "Starred" },
];

export function ViewToolbar({
  viewType,
  config,
  allLabels,
  onViewTypeChange,
  onConfigChange,
  folderId,
  onManageTemplates,
}: ViewToolbarProps) {
  const [filterOpen, setFilterOpen] = useState(false);

  const activeFiltersCount = config.filters.length;

  const handleSortChange = (field: SortField, addToMulti: boolean = false) => {
    const currentRules = config.sortRules || [{ field: config.sortField, direction: config.sortDirection }];
    const existingIndex = currentRules.findIndex((r) => r.field === field);

    let newRules = [...currentRules];

    if (existingIndex === 0 && !addToMulti) {
      // Toggle direction of primary sort
      newRules[0] = {
        ...newRules[0],
        direction: newRules[0].direction === "asc" ? "desc" : "asc",
      };
    } else if (existingIndex > 0) {
      // Move to primary sort
      const [rule] = newRules.splice(existingIndex, 1);
      newRules.unshift({ ...rule, direction: "desc" });
    } else if (existingIndex === -1) {
      if (addToMulti) {
        // Add as secondary sort
        newRules.push({ field, direction: "desc" });
      } else {
        // Replace primary sort
        newRules = [{ field, direction: "desc" }];
      }
    }

    // Keep max 3 sort rules
    newRules = newRules.slice(0, 3);

    onConfigChange({
      ...config,
      sortField: newRules[0]?.field || "updated_at",
      sortDirection: newRules[0]?.direction || "desc",
      sortRules: newRules,
    });
  };

  const handleRemoveSort = (index: number) => {
    const currentRules = config.sortRules || [];
    const newRules = currentRules.filter((_, i) => i !== index);

    if (newRules.length === 0) {
      newRules.push({ field: "updated_at", direction: "desc" });
    }

    onConfigChange({
      ...config,
      sortField: newRules[0].field,
      sortDirection: newRules[0].direction,
      sortRules: newRules,
    });
  };

  const handleGroupByChange = (field: GroupByField) => {
    onConfigChange({
      ...config,
      groupByField: field,
    });
  };

  const handleAddFilter = (filter: FilterRule) => {
    // Don't add duplicate filters
    const exists = config.filters.some(
      (f) =>
        f.field === filter.field &&
        f.operator === filter.operator &&
        f.value === filter.value
    );
    if (!exists) {
      onConfigChange({
        ...config,
        filters: [...config.filters, filter],
      });
    }
  };

  const handleRemoveFilter = (index: number) => {
    onConfigChange({
      ...config,
      filters: config.filters.filter((_, i) => i !== index),
    });
  };

  const handleClearFilters = () => {
    onConfigChange({
      ...config,
      filters: [],
    });
  };

  return (
    <div className="flex items-center gap-2">
      {/* View Type Switcher */}
      <div className="flex items-center border border-[#E8DCC4] rounded-md overflow-hidden">
        {VIEW_TYPES.map(({ type, icon: Icon, label }) => (
          <Button
            key={type}
            variant="ghost"
            size="sm"
            className={cn(
              "rounded-none h-8 px-3",
              viewType === type
                ? "bg-[#1E3D32] text-white hover:bg-[#1E3D32]"
                : "text-[#5C7A6B] hover:bg-[#F5F0E6]"
            )}
            onClick={() => onViewTypeChange(type)}
            title={label}
          >
            <Icon className="w-4 h-4" />
          </Button>
        ))}
      </div>

      {/* Sort Dropdown with Multi-Sort */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "gap-1",
              (config.sortRules?.length || 0) > 1
                ? "text-[#1E3D32] bg-[#F5F0E6]"
                : "text-[#5C7A6B] hover:bg-[#F5F0E6]"
            )}
          >
            {config.sortDirection === "asc" ? (
              <SortAsc className="w-4 h-4" />
            ) : (
              <SortDesc className="w-4 h-4" />
            )}
            <span className="text-xs">
              Sort{(config.sortRules?.length || 0) > 1 && ` (${config.sortRules?.length})`}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-48 p-2">
          <div className="space-y-2">
            <div className="text-xs font-medium text-[#1E3D32]">Sort by</div>

            {/* Current Sort Rules */}
            {(config.sortRules || [{ field: config.sortField, direction: config.sortDirection }]).map((rule, index) => (
              <div key={index} className="flex items-center gap-1.5 bg-[#F5F0E6] rounded px-2 py-1">
                <span className="text-[10px] text-[#8B9A8F] w-3">{index + 1}.</span>
                <span className="text-xs flex-1">
                  {SORT_FIELDS.find((s) => s.field === rule.field)?.label}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 px-0.5"
                  onClick={() => handleSortChange(rule.field)}
                >
                  {rule.direction === "asc" ? (
                    <SortAsc className="w-3 h-3" />
                  ) : (
                    <SortDesc className="w-3 h-3" />
                  )}
                </Button>
                {(config.sortRules?.length || 0) > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0"
                    onClick={() => handleRemoveSort(index)}
                  >
                    <X className="w-2.5 h-2.5" />
                  </Button>
                )}
              </div>
            ))}

            {/* Add Sort */}
            {(config.sortRules?.length || 1) < 3 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7">
                      + Add sort
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-36">
                    {SORT_FIELDS.filter(
                      (s) => !(config.sortRules || []).some((r) => r.field === s.field)
                    ).map(({ field, label }) => (
                      <DropdownMenuItem
                        key={field}
                        onClick={() => handleSortChange(field, true)}
                        className="text-xs py-1"
                      >
                        {label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Group By Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "gap-1",
              config.groupByField
                ? "text-[#1E3D32] bg-[#F5F0E6]"
                : "text-[#5C7A6B] hover:bg-[#F5F0E6]"
            )}
          >
            <Columns className="w-4 h-4" />
            <span className="text-xs">
              {config.groupByField
                ? `Group: ${GROUP_BY_OPTIONS.find((g) => g.field === config.groupByField)?.label}`
                : "Group"}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          {GROUP_BY_OPTIONS.map(({ field, label }) => (
            <DropdownMenuItem
              key={field || "none"}
              onClick={() => handleGroupByChange(field)}
              className={cn("text-xs py-1", config.groupByField === field && "bg-[#F5F0E6]")}
            >
              <div className="flex items-center justify-between w-full">
                <span>{label}</span>
                {config.groupByField === field && <Check className="w-3 h-3" />}
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Filter Popover */}
      <Popover open={filterOpen} onOpenChange={setFilterOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "gap-1",
              activeFiltersCount > 0
                ? "text-[#1E3D32] bg-[#F5F0E6]"
                : "text-[#5C7A6B] hover:bg-[#F5F0E6]"
            )}
          >
            <Filter className="w-4 h-4" />
            <span className="text-xs">Filter</span>
            {activeFiltersCount > 0 && (
              <span className="ml-1 bg-[#1E3D32] text-white text-xs px-1.5 rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-52 p-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#1E3D32]">Filters</span>
              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="text-[10px] text-[#5C7A6B] h-5 px-1"
                >
                  Clear
                </Button>
              )}
            </div>

            {/* Active Filters */}
            {config.filters.length > 0 && (
              <div className="space-y-1">
                {config.filters.map((filter, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-[#F5F0E6] rounded px-2 py-0.5"
                  >
                    <span className="text-[10px] text-[#1E3D32]">
                      {filter.field === "is_starred" && "Starred"}
                      {filter.field === "note_type" && `Type: ${filter.value}`}
                      {filter.field === "tags" &&
                        (filter.operator === "contains"
                          ? `Label: ${filter.value}`
                          : filter.operator === "is_empty"
                          ? "No label"
                          : "Has label")}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0"
                      onClick={() => handleRemoveFilter(index)}
                    >
                      <X className="w-2.5 h-2.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <DropdownMenuSeparator />

            {/* Add Filter Options */}
            <div className="space-y-1">
              <span className="text-[10px] text-[#8B9A8F]">Add filter</span>

              {/* Starred Filter */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs h-7"
                onClick={() =>
                  handleAddFilter({
                    field: "is_starred",
                    operator: "eq",
                    value: true,
                  })
                }
              >
                Starred only
              </Button>

              {/* Type Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs h-7"
                  >
                    By type...
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-32">
                  <DropdownMenuItem
                    className="text-xs py-1"
                    onClick={() =>
                      handleAddFilter({
                        field: "note_type",
                        operator: "eq",
                        value: "document",
                      })
                    }
                  >
                    Document
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-xs py-1"
                    onClick={() =>
                      handleAddFilter({
                        field: "note_type",
                        operator: "eq",
                        value: "meeting",
                      })
                    }
                  >
                    Meeting
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-xs py-1"
                    onClick={() =>
                      handleAddFilter({
                        field: "note_type",
                        operator: "eq",
                        value: "quick capture",
                      })
                    }
                  >
                    Quick Capture
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Label Filter */}
              {allLabels.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs h-7"
                    >
                      By label...
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-32">
                    {allLabels.map((label) => {
                      const colors = getLabelColor(label);
                      return (
                        <DropdownMenuItem
                          key={label}
                          className="text-xs py-1"
                          onClick={() =>
                            handleAddFilter({
                              field: "tags",
                              operator: "contains",
                              value: label,
                            })
                          }
                        >
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[10px]",
                              colors.bg,
                              colors.text
                            )}
                          >
                            {label}
                          </span>
                        </DropdownMenuItem>
                      );
                    })}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-xs py-1"
                      onClick={() =>
                        handleAddFilter({
                          field: "tags",
                          operator: "is_empty",
                          value: null,
                        })
                      }
                    >
                      No label
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Template Selector - only show if folderId is provided */}
      {folderId && onManageTemplates && (
        <TemplateSelector
          folderId={folderId}
          onManageTemplates={onManageTemplates}
        />
      )}
    </div>
  );
}
