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
    private parentMap: Map<string, string[]> = new Map();

    constructor(config: LayerConfig[], availableLayers: LayerDefinition[]) {
        this.config = config;
        this.availableLayers = availableLayers;
    }

    public validate(): ValidationResult {
        const errors: string[] = [];

        // Schritt 1: Alle bekannten Layer-IDs erfassen
        const availableLayerIds = new Set(this.availableLayers.map(l => l.id));

        // Schritt 2: Eindeutigkeit der Konfigurations-IDs prüfen
        for (const entry of this.config) {
            if (this.idSet.has(entry.id)) {
                errors.push(`Duplicate ID found: ${entry.id}`);
            }
            this.idSet.add(entry.id);
        }

        // Schritt 3: Validität der Referenzen prüfen
        for (const entry of this.config) {
            // Parent muss existieren
            if (entry.newParentId && !this.idSet.has(entry.newParentId)) {
                errors.push(`Invalid parent reference: ${entry.id} refers to unknown parent ${entry.newParentId}`);
            }

            // Konfiguration muss existierenden Layer referenzieren oder neue Gruppe sein
            if (!availableLayerIds.has(entry.id) && !this.config.some(c => c.id === entry.id && !c.newParentId)) {
                errors.push(`ID ${entry.id} does not match any available layer.`);
            }

            // Baum für Zyklusprüfung vorbereiten
            if (entry.newParentId) {
                const children = this.parentMap.get(entry.newParentId) || [];
                children.push(entry.id);
                this.parentMap.set(entry.newParentId, children);
            }
        }

        // Schritt 4: Zyklusprüfung
        const visited = new Set<string>();
        const stack = new Set<string>();

        const hasCycle = (nodeId: string): boolean => {
            if (!this.parentMap.has(nodeId)) return false;
            if (stack.has(nodeId)) return true;
            if (visited.has(nodeId)) return false;

            visited.add(nodeId);
            stack.add(nodeId);

            for (const childId of this.parentMap.get(nodeId)!) {
                if (hasCycle(childId)) return true;
            }

            stack.delete(nodeId);
            return false;
        };

        for (const id of this.idSet) {
            if (hasCycle(id)) {
                errors.push(`Cycle detected in configuration hierarchy starting at: ${id}`);
                break;
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}
