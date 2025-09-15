///
/// Copyright (C) 2025 con terra GmbH (info@conterra.de)
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///         http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.
///

import type { LayerConfig, LayerDefinition, ValidationResult } from '../api';

export class ConfigurationValidationController {
    private config: LayerConfig[];
    private availableLayers: LayerDefinition[];
    private idSet: Set<string> = new Set();

    constructor(config: LayerConfig[], availableLayers: LayerDefinition[]) {
        this.config = config;
        this.availableLayers = availableLayers;
    }

    public validate(): ValidationResult {
        const errors: string[] = [];

        // Reset state for this validation
        this.idSet.clear();

        // Basic structure validation
        this.validateBasicStructure(errors);

        if (errors.length > 0) {
            return { valid: false, errors };
        }

        const availableLayerIds = new Set(this.availableLayers.map(l => l.id));
        const availableGroupLayers = new Set(
            this.availableLayers.filter(l => l.type === 'group').map(l => l.id)
        );

        // First pass: check for duplicate IDs and build the set
        for (const entry of this.config) {
            if (this.idSet.has(entry.id)) {
                errors.push(`Duplicate ID found: ${entry.id}`);
            }
            this.idSet.add(entry.id);
        }

        // Second pass: validate each entry
        this.validateConfigurationEntries(errors, availableLayerIds, availableGroupLayers);

        // Cycle detection - traverse upward through parent relationships
        this.validateHierarchyCycles(errors);

        // Parent-child relationship validation
        this.validateParentChildRelationships(errors, availableGroupLayers);

        // Order validation
        this.validateOrderConfiguration(errors);

        return {
            valid: errors.length === 0,
            errors
        };
    }

    private validateBasicStructure(errors: string[]): void {
        if (!Array.isArray(this.config)) {
            errors.push("Configuration must be an array");
            return;
        }

        if (this.config.length === 0) {
            errors.push("Configuration array is empty");
            return;
        }

        for (let i = 0; i < this.config.length; i++) {
            const entry = this.config[i];

            if (!entry || typeof entry !== 'object') {
                errors.push(`Configuration entry at index ${i} is not a valid object`);
                continue;
            }

            // Validate required 'id' property
            if (!entry.id || typeof entry.id !== 'string' || entry.id.trim() === '') {
                errors.push(`Configuration entry at index ${i} missing or invalid 'id' property`);
                continue;
            }

            // Validate optional 'newParentId' property
            if (entry.newParentId !== undefined) {
                if (typeof entry.newParentId !== 'string' || entry.newParentId.trim() === '') {
                    errors.push(`Configuration entry '${entry.id}' has invalid 'newParentId' property`);
                }

                // Check if trying to set itself as parent
                if (entry.newParentId === entry.id) {
                    errors.push(`Configuration entry '${entry.id}' cannot have itself as parent`);
                }
            }

            // Validate optional 'order' property
            if (entry.order !== undefined) {
                if (typeof entry.order !== 'number' || !Number.isFinite(entry.order)) {
                    errors.push(
                        `Configuration entry '${entry.id}' has invalid 'order' property (must be a finite number)`
                    );
                }
            }

            // Check for unexpected properties
            const allowedProperties = ['id', 'newParentId', 'order'];
            const entryKeys = Object.keys(entry);
            for (const key of entryKeys) {
                if (!allowedProperties.includes(key)) {
                    errors.push(`Configuration entry '${entry.id}' contains unexpected property '${key}'`);
                }
            }
        }
    }

    private validateConfigurationEntries(
        errors: string[],
        availableLayerIds: Set<string>,
        availableGroupLayers: Set<string>
    ): void {
        const processedConfigIds = new Set<string>();

        for (const entry of this.config) {
            // Skip if basic validation already failed
            if (!entry.id) continue;

            // Validate layer existence
            const layerExists = availableLayerIds.has(entry.id);
            const isNewLayer = this.idSet.has(entry.id) && !layerExists;

            if (!layerExists && !isNewLayer) {
                // This might be a dynamically created group - we'll allow it but warn
                console.warn(`Layer '${entry.id}' not found in available layers - will be created as group layer`);
            }

            if (entry.newParentId) {
                // Check if parent exists or will be created
                const parentExists = availableLayerIds.has(entry.newParentId);
                const parentInConfig = this.idSet.has(entry.newParentId);

                if (!parentExists && !parentInConfig) {
                    errors.push(
                        `Parent layer '${entry.newParentId}' for '${entry.id}' does not exist ` +
                        `and is not defined in configuration`
                    );
                }

                // If parent exists in map, it must be a group layer
                if (parentExists && !availableGroupLayers.has(entry.newParentId)) {
                    const parentLayer = this.availableLayers.find(l => l.id === entry.newParentId);
                    if (parentLayer && parentLayer.type !== 'group') {
                        errors.push(
                            `Parent layer '${entry.newParentId}' for '${entry.id}' is not a group layer ` +
                            `(type: ${parentLayer.type})`
                        );
                    }
                }

                // If parent is in config, it must be processed earlier (no forward references)
                if (parentInConfig && !processedConfigIds.has(entry.newParentId)) {
                    errors.push(
                        `Forward reference detected: '${entry.id}' refers to parent '${entry.newParentId}' ` +
                        `which is defined later in the configuration`
                    );
                }
            }

            // Add this ID to processed set for next iterations
            processedConfigIds.add(entry.id);
        }
    }

    private validateHierarchyCycles(errors: string[]): void {
        const parentLookup = new Map<string, string>();
        for (const entry of this.config) {
            if (entry.newParentId) {
                parentLookup.set(entry.id, entry.newParentId);
            }
        }

        const detectCycle = (nodeId: string): string[] | null => {
            const visited = new Set<string>();
            const path: string[] = [];
            let current = nodeId;

            while (current && parentLookup.has(current)) {
                if (visited.has(current)) {
                    const cycleStart = path.indexOf(current);
                    return path.slice(cycleStart).concat([current]);
                }
                visited.add(current);
                path.push(current);
                current = parentLookup.get(current)!;
            }
            return null;
        };

        const checkedNodes = new Set<string>();
        for (const entry of this.config) {
            if (!checkedNodes.has(entry.id)) {
                const cycle = detectCycle(entry.id);
                if (cycle) {
                    errors.push(`Circular dependency detected: ${cycle.join(' -> ')}`);
                    // Mark all nodes in the cycle as checked to avoid duplicate reports
                    cycle.forEach(nodeId => checkedNodes.add(nodeId));
                }
                checkedNodes.add(entry.id);
            }
        }
    }

    private validateParentChildRelationships(errors: string[], _availableGroupLayers: Set<string>): void {
        // Check for layers that might become orphaned
        const allParentIds = new Set<string>();
        const allChildIds = new Set<string>();

        for (const entry of this.config) {
            if (entry.newParentId) {
                allParentIds.add(entry.newParentId);
                allChildIds.add(entry.id);
            }
        }

        // Warn about potential deep nesting (performance consideration)
        for (const entry of this.config) {
            if (entry.newParentId) {
                const depth = this.calculateNestingDepth(entry.id);
                if (depth > 5) {
                    errors.push(
                        `Warning: Layer '${entry.id}' has deep nesting (depth: ${depth}), ` +
                        `which may affect performance`
                    );
                }
            }
        }
    }

    private validateOrderConfiguration(errors: string[]): void {
        // Check for order conflicts within the same parent
        const parentToChildren = new Map<string, Array<{ id: string, order?: number }>>();

        // Group entries by their parent (root level has undefined parent)
        for (const entry of this.config) {
            const parentId = entry.newParentId || '__ROOT__';
            if (!parentToChildren.has(parentId)) {
                parentToChildren.set(parentId, []);
            }
            parentToChildren.get(parentId)!.push({ id: entry.id, order: entry.order });
        }

        // Check each parent group for order conflicts
        for (const [parentId, children] of parentToChildren) {
            const orderedChildren = children.filter(child => child.order !== undefined);
            const unorderedChildren = children.filter(child => child.order === undefined);

            // Check for duplicate order values
            const orderCounts = new Map<number, string[]>();
            for (const child of orderedChildren) {
                const order = child.order!;
                if (!orderCounts.has(order)) {
                    orderCounts.set(order, []);
                }
                orderCounts.get(order)!.push(child.id);
            }

            for (const [order, layerIds] of orderCounts) {
                if (layerIds.length > 1) {
                    const parentName = parentId === '__ROOT__' ? 'root level' : `parent '${parentId}'`;
                    errors.push(`Duplicate order ${order} found in ${parentName} for layers: ${layerIds.join(', ')}`);
                }
            }

            // Warn about mixing ordered and unordered children
            if (orderedChildren.length > 0 && unorderedChildren.length > 0) {
                const parentName = parentId === '__ROOT__' ? 'root level' : `parent '${parentId}'`;
                errors.push(`Warning: Mixing ordered and unordered layers in ${parentName}. Unordered layers: ${unorderedChildren.map(c => c.id).join(', ')}`);
            }
        }
    }

    private calculateNestingDepth(layerId: string): number {
        const parentLookup = new Map<string, string>();
        for (const entry of this.config) {
            if (entry.newParentId) {
                parentLookup.set(entry.id, entry.newParentId);
            }
        }

        let depth = 0;
        let current = layerId;
        const visited = new Set<string>();

        while (current && parentLookup.has(current)) {
            if (visited.has(current)) {
                break; // Avoid infinite loop in case of cycles
            }
            visited.add(current);
            current = parentLookup.get(current)!;
            depth++;
        }

        return depth;
    }
}
