/* globals describe, context, it */

const assert = require('assert');
const accessibilityChecklist = require('../../../src/pull-request/checklists/accessibility.js');

describe('Accessibility checklist', () => {
    describe('#isActive', () => {
        it('should return false when jsxChanged is false', () => {
            assert.equal(accessibilityChecklist.isActive({ jsxChanged: false }), false);
        });

        it('should return false when args.jsx is false', () => {
            assert.equal(accessibilityChecklist.isActive({ args: { jsx: false } }), false);
        });

        it('should return true when jsxChanged is true', () => {
            assert.equal(accessibilityChecklist.isActive({ jsxChanged: true }), true);
        });
        it('should return true when args.jsx is true', () => {
            assert.equal(accessibilityChecklist.isActive({ args: { jsx: true } }), true);
        });

        context('when both jsxChanged and args.jsx are present', () => {
            it('should prioritise args.jsx value when true', () => {
                assert.equal(accessibilityChecklist.isActive({ jsxChanged: false, args: { jsx: true } }), true);
            });
            it('should prioritise args.jsx value when false', () => {
                assert.equal(accessibilityChecklist.isActive({ jsxChanged: true, args: { jsx: false } }), false);
            });
        });
    });
});
