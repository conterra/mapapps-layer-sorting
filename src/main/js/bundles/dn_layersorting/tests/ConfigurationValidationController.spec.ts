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

/* eslint-disable @typescript-eslint/no-unused-expressions */

import { expect } from "chai";
import { ConfigurationValidationController } from '../controllers/ConfigurationValidationController';

import type { LayerConfig, LayerDefinition } from '../api';

describe('ConfigurationValidationController.validate', () => {
    const availableLayers: LayerDefinition[] = [
        { id: 'layer1', type: 'layer' },
        { id: 'layer2', type: 'layer' },
        { id: 'layer3', type: 'layer' },
        { id: 'existing_group', type: 'group' },
        { id: 'non_group_layer', type: 'layer' }
    ];

    describe('Basic validation', () => {
        it('should return valid for unique IDs and valid parents', () => {
            const config: LayerConfig[] = [
                { id: 'existing_group' },
                { id: 'layer1', newParentId: 'existing_group' },
                { id: 'layer2', newParentId: 'existing_group' }
            ];
            const controller = new ConfigurationValidationController(config, availableLayers);
            const result = controller.validate();
            expect(result.valid).to.be.true;
            expect(result.errors).to.be.empty;
        });

        it('should detect empty configuration', () => {
            const config: LayerConfig[] = [];
            const controller = new ConfigurationValidationController(config, availableLayers);
            const result = controller.validate();
            expect(result.valid).to.be.false;
            expect(result.errors.some(e => e.includes('Configuration array is empty'))).to.be.true;
        });

        it('should detect invalid configuration structure', () => {
            const config = [null, undefined, 'invalid'] as any;
            const controller = new ConfigurationValidationController(config, availableLayers);
            const result = controller.validate();
            expect(result.valid).to.be.false;
            expect(result.errors.some(e => e.includes('not a valid object'))).to.be.true;
        });
    });

    describe('ID validation', () => {
        it('should detect duplicate IDs', () => {
            const config: LayerConfig[] = [
                { id: 'layer1' },
                { id: 'layer1' }
            ];
            const controller = new ConfigurationValidationController(config, availableLayers);
            const result = controller.validate();
            expect(result.valid).to.be.false;
            expect(result.errors.some(e => e.includes('Duplicate ID found: layer1'))).to.be.true;
        });

        it('should detect missing ID property', () => {
            const config: LayerConfig[] = [
                {} as LayerConfig,
                { id: '' },
                { id: '   ' }
            ];
            const controller = new ConfigurationValidationController(config, availableLayers);
            const result = controller.validate();
            expect(result.valid).to.be.false;
            expect(result.errors.some(e => e.includes("missing or invalid 'id' property"))).to.be.true;
        });

        it('should detect self-referencing parent', () => {
            const config: LayerConfig[] = [
                { id: 'layer1', newParentId: 'layer1' }
            ];
            const controller = new ConfigurationValidationController(config, availableLayers);
            const result = controller.validate();
            expect(result.valid).to.be.false;
            expect(result.errors.some(e => e.includes('cannot have itself as parent'))).to.be.true;
        });
    });

    describe('Parent-child relationship validation', () => {
        it('should detect forward references', () => {
            const config: LayerConfig[] = [
                { id: 'layer1', newParentId: 'layer2' },
                { id: 'layer2' }
            ];
            const controller = new ConfigurationValidationController(config, availableLayers);
            const result = controller.validate();
            expect(result.valid).to.be.false;
            expect(result.errors.some(e => e.includes('Forward reference detected'))).to.be.true;
        });

        it('should detect non-existent parent', () => {
            const config: LayerConfig[] = [
                { id: 'layer1', newParentId: 'non_existent_parent' }
            ];
            const controller = new ConfigurationValidationController(config, availableLayers);
            const result = controller.validate();
            expect(result.valid).to.be.false;
            expect(result.errors.some(e => e.includes('does not exist and is not defined in configuration'))).to.be.true;
        });

        it('should detect parent that is not a group layer', () => {
            const config: LayerConfig[] = [
                { id: 'layer1', newParentId: 'non_group_layer' }
            ];
            const controller = new ConfigurationValidationController(config, availableLayers);
            const result = controller.validate();
            expect(result.valid).to.be.false;
            expect(result.errors.some(e => e.includes('is not a group layer'))).to.be.true;
        });
    });

    describe('Circular dependency detection', () => {
        it('should detect cycles in hierarchy', () => {
            const config: LayerConfig[] = [
                { id: 'group1' },
                { id: 'group2', newParentId: 'group3' },
                { id: 'group3', newParentId: 'group1' },
                { id: 'group1', newParentId: 'group2' }
            ];
            const controller = new ConfigurationValidationController(config, availableLayers);
            const result = controller.validate();
            expect(result.valid).to.be.false;
            expect(result.errors.some(e => e.includes('Circular dependency detected'))).to.be.true;
        });

        it('should detect simple two-node cycle', () => {
            const config: LayerConfig[] = [
                { id: 'group1', newParentId: 'group2' },
                { id: 'group2', newParentId: 'group1' }
            ];
            const controller = new ConfigurationValidationController(config, availableLayers);
            const result = controller.validate();
            expect(result.valid).to.be.false;
            expect(result.errors.some(e => e.includes('Circular dependency detected'))).to.be.true;
        });
    });

    describe('Order validation', () => {
        it('should detect invalid order property', () => {
            const config: LayerConfig[] = [
                { id: 'layer1', order: 'invalid' as any },
                { id: 'layer2', order: NaN },
                { id: 'layer3', order: Infinity }
            ];
            const controller = new ConfigurationValidationController(config, availableLayers);
            const result = controller.validate();
            expect(result.valid).to.be.false;
            expect(result.errors.some(e => e.includes('invalid \'order\' property'))).to.be.true;
        });

        it('should detect duplicate order values in same parent', () => {
            const config: LayerConfig[] = [
                { id: 'group1' },
                { id: 'layer1', newParentId: 'group1', order: 1 },
                { id: 'layer2', newParentId: 'group1', order: 1 }
            ];
            const controller = new ConfigurationValidationController(config, availableLayers);
            const result = controller.validate();
            expect(result.valid).to.be.false;
            expect(result.errors.some(e => e.includes('Duplicate order 1 found'))).to.be.true;
        });

        it('should warn about mixing ordered and unordered layers', () => {
            const config: LayerConfig[] = [
                { id: 'group1' },
                { id: 'layer1', newParentId: 'group1', order: 1 },
                { id: 'layer2', newParentId: 'group1' } // no order specified
            ];
            const controller = new ConfigurationValidationController(config, availableLayers);
            const result = controller.validate();
            expect(result.valid).to.be.false;
            expect(result.errors.some(e => e.includes('Mixing ordered and unordered layers'))).to.be.true;
        });
    });

    describe('Property validation', () => {
        it('should detect unexpected properties', () => {
            const config: LayerConfig[] = [
                { id: 'layer1', unexpectedProp: 'value' } as any
            ];
            const controller = new ConfigurationValidationController(config, availableLayers);
            const result = controller.validate();
            expect(result.valid).to.be.false;
            expect(result.errors.some(e => e.includes('unexpected property \'unexpectedProp\''))).to.be.true;
        });

        it('should detect invalid newParentId property', () => {
            const config: LayerConfig[] = [
                { id: 'layer1', newParentId: '' },
                { id: 'layer2', newParentId: '   ' },
                { id: 'layer3', newParentId: null as any }
            ];
            const controller = new ConfigurationValidationController(config, availableLayers);
            const result = controller.validate();
            expect(result.valid).to.be.false;
            expect(result.errors.some(e => e.includes('invalid \'newParentId\' property'))).to.be.true;
        });
    });

    describe('Performance warnings', () => {
        it('should warn about deep nesting', () => {
            const config: LayerConfig[] = [
                { id: 'level1' },
                { id: 'level2', newParentId: 'level1' },
                { id: 'level3', newParentId: 'level2' },
                { id: 'level4', newParentId: 'level3' },
                { id: 'level5', newParentId: 'level4' },
                { id: 'level6', newParentId: 'level5' },
                { id: 'level7', newParentId: 'level6' }
            ];
            const controller = new ConfigurationValidationController(config, availableLayers);
            const result = controller.validate();
            expect(result.valid).to.be.false;
            expect(result.errors.some(e => e.includes('deep nesting') && e.includes('may affect performance'))).to.be.true;
        });
    });

    describe('Edge cases', () => {
        it('should handle configuration with layers that will be created dynamically', () => {
            const config: LayerConfig[] = [
                { id: 'new_group' }, // This will be created as a new group
                { id: 'layer1', newParentId: 'new_group' }
            ];
            const controller = new ConfigurationValidationController(config, availableLayers);
            const result = controller.validate();
            expect(result.valid).to.be.true;
            expect(result.errors).to.be.empty;
        });

        it('should allow referencing existing group layers', () => {
            const config: LayerConfig[] = [
                { id: 'layer1', newParentId: 'existing_group' }
            ];
            const controller = new ConfigurationValidationController(config, availableLayers);
            const result = controller.validate();
            expect(result.valid).to.be.true;
            expect(result.errors).to.be.empty;
        });
    });
});
