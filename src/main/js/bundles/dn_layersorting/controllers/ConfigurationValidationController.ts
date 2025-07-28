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

        const availableLayerIds = new Set(this.availableLayers.map(l => l.id));

        // First pass: check for duplicate IDs and build the set
        for (const entry of this.config) {
            if (this.idSet.has(entry.id)) {
                errors.push(`Duplicate ID found: ${entry.id}`);
            }
            this.idSet.add(entry.id);
        }

        // Second pass: validate each entry
        const processedConfigIds = new Set<string>();

        for (const entry of this.config) {
            // Skip validation for layer IDs if they have a newParentId -
            // these could be domain layers or new groups being created
            if (!entry.newParentId && !availableLayerIds.has(entry.id)) {
                errors.push(`ID ${entry.id} does not match any available layer.`);
            }

            // Check parent reference validity
            if (entry.newParentId) {
                // If parent ID is in the config, it must have been processed earlier (no forward references)
                if (this.idSet.has(entry.newParentId)) {
                    if (!processedConfigIds.has(entry.newParentId)) {
                        errors.push(
                            `Invalid parent reference: ${entry.id} refers to unknown parent ${entry.newParentId}`
                        );
                    }
                }
                // Note: We allow newParentId to reference existing layers or IDs that will be created dynamically
            }

            // Add this ID to processed set for next iterations
            processedConfigIds.add(entry.id);
        }

        // Cycle detection - traverse upward through parent relationships
        const parentLookup = new Map<string, string>();
        for (const entry of this.config) {
            if (entry.newParentId) {
                parentLookup.set(entry.id, entry.newParentId);
            }
        }

        const detectCycle = (nodeId: string): boolean => {
            const visited = new Set<string>();
            let current = nodeId;

            while (current && parentLookup.has(current)) {
                if (visited.has(current)) {
                    return true; // Cycle detected
                }
                visited.add(current);
                current = parentLookup.get(current)!;
            }
            return false;
        };

        for (const entry of this.config) {
            if (detectCycle(entry.id)) {
                errors.push(`Cycle detected in configuration hierarchy starting at: ${entry.id}`);
                break;
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}
