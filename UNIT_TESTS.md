# Unit Tests for Match Generation

## Overview

This test suite provides comprehensive coverage for the Fylde Pickleball match generation algorithms. It tests all game modes (League, 5-Player Championship, Round-Robin) and partner practice formats.

## Test Files

### `__tests__/matchGenerator.test.js`
Tests for the main match generation library (`lib/matchGenerator.js`)

**Coverage**:
- ✅ `generateWeeklyMatches()` - Weekly doubles match generation
- ✅ `generateLeagueSchedules()` - League format with teams and byes
- ✅ `generate5PlayerChampMatches()` - 5-player championship format (15-game schedule)
- ✅ `generateRoundRobinMatches()` - Round-robin tournament format

### `__tests__/matchGeneratorPartnerPractice.test.js`
Tests for partner practice match generation (`lib/matchGeneratorPartnerPractice.js`)

**Coverage**:
- ✅ `generatePartnerPracticeRandom()` - Random partner practice with designated partners

## Installation

### 1. Install Test Dependencies

```bash
npm install --save-dev jest @babel/core @babel/preset-env @babel/preset-react @babel/plugin-proposal-class-properties babel-jest
```

### 2. Configuration Files

The following configuration files are already in place:
- `jest.config.js` - Jest test runner configuration
- `.babelrc` - Babel transpiler configuration

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
Watch for file changes and re-run tests automatically:
```bash
npm run test:watch
```

### Run Tests with Coverage Report
```bash
npm run test:coverage
```

### Run Specific Test File
```bash
npm test -- __tests__/matchGenerator.test.js
```

### Run Tests Matching Pattern
```bash
npm test -- --testNamePattern="5PlayerChamp"
```

## Test Structure

Each test suite follows this pattern:

```javascript
describe('FunctionName', () => {
  test('should do something specific', () => {
    // Arrange
    const players = createMockPlayers(6, true);
    
    // Act
    const result = generateMatches(players);
    
    // Assert
    expect(result.length).toBeGreaterThan(0);
  });
});
```

## Test Categories

### 1. Input Validation Tests
Verify functions handle edge cases:
- Empty player lists
- Insufficient players
- Exactly required number of players
- Excess players

**Example**:
```javascript
test('should require exactly 5 players', () => {
  const players = createMockPlayers(4, true);
  const result = generate5PlayerChampMatches(players);
  expect(result.error).toBeDefined();
});
```

### 2. Output Structure Tests
Verify generated matches have correct format:
- Match contains correct number of teams
- Each team has correct number of players
- All required fields present

**Example**:
```javascript
test('should have correct match structure', () => {
  const result = generate5PlayerChampMatches(players);
  
  for (const match of result.matches) {
    expect(match.teamA.length).toBe(2);
    expect(match.teamB.length).toBe(2);
  }
});
```

### 3. Fairness Tests
Verify matches are balanced:
- Games evenly distributed per player
- Rest opportunities evenly distributed
- Different partnerships created

**Example**:
```javascript
test('should balance player games', () => {
  const result = generateRoundRobinMatches(players);
  
  // Count games per player
  const gamesPerPlayer = {};
  // ... calculation ...
  
  const max = Math.max(...counts);
  const min = Math.min(...counts);
  expect(max - min).toBeLessThanOrEqual(2);
});
```

### 4. Logic Validation Tests
Verify algorithmic correctness:
- No duplicate players in match
- All players included when required
- Proper rotation of sitting players

**Example**:
```javascript
test('should rotate sitting out players', () => {
  const result = generate5PlayerChampMatches(players);
  
  const sittingOutCounts = {};
  players.forEach(p => { sittingOutCounts[p.id] = 0; });
  
  for (const match of result.matches) {
    sittingOutCounts[match.sittingOut.id]++;
  }
  
  // Each player sits out exactly 3 times
  for (const count of Object.values(sittingOutCounts)) {
    expect(count).toBe(3);
  }
});
```

### 5. Data Filtering Tests
Verify inactive players are excluded:
- Inactive players not in matches
- Only active players participate
- Filtering happens automatically

**Example**:
```javascript
test('should filter inactive players', () => {
  const players = [
    createMockPlayer(1, 'Active', true),
    createMockPlayer(2, 'Inactive', false),
  ];
  const result = generateMatches(players);
  
  const allPlayerIds = new Set();
  // ... collect all IDs from matches ...
  
  expect(allPlayerIds.has(2)).toBe(false);
});
```

## Key Test Utilities

### Mock Player Creation
```javascript
// Single player
const player = createMockPlayer(1, 'Alice', true, 'female');

// Multiple players
const players = createMockPlayers(6, true);

// Paired players (for partner practice)
const pairs = createPairedPlayers(2); // Creates 4 players in 2 pairs
```

### Assertions Used

**Common Jest Matchers**:
```javascript
expect(result).toBeDefined()           // Value is defined
expect(result).toEqual([])             // Deep equality
expect(result).toBeGreaterThan(0)      // Numeric comparison
expect(result.length).toBe(2)          // Exact equality
expect(array.has(x)).toBe(false)       // Presence check
expect(() => fn()).toThrow()           // Exception throwing
```

## Test Statistics

### matchGenerator.js Tests
- **Total Tests**: 35+
- **Test Categories**:
  - generateWeeklyMatches: 7 tests
  - generateLeagueSchedules: 9 tests
  - generate5PlayerChampMatches: 8 tests
  - generateRoundRobinMatches: 11+ tests

### matchGeneratorPartnerPractice.js Tests
- **Total Tests**: 18+
- **Test Categories**:
  - generatePartnerPracticeRandom: 18+ tests

## Expected Test Results

When all tests pass, you'll see:

```
 PASS  __tests__/matchGenerator.test.js
 PASS  __tests__/matchGeneratorPartnerPractice.test.js

Test Suites: 2 passed, 2 total
Tests:       53 passed, 53 total
```

## Coverage Goals

**Current Coverage Areas**:
- ✅ Input validation (all modes)
- ✅ Output structure (all modes)
- ✅ Edge cases (empty lists, minimum players, etc.)
- ✅ Fairness metrics (game distribution, rest balance)
- ✅ Data integrity (no duplicates, proper filtering)
- ✅ Algorithm correctness (rotations, partnerships)

**Potential Future Coverage**:
- Performance testing (large player counts)
- Integration tests (with database)
- Snapshot tests (output comparison)
- Property-based testing (random inputs)

## Troubleshooting

### Tests Won't Run
**Problem**: Jest command not found
**Solution**:
```bash
npm install --save-dev jest babel-jest
```

### Import Errors
**Problem**: Cannot find module
**Solution**:
1. Verify file exists at specified path
2. Check for circular imports
3. Ensure proper ES6 export syntax in source files

### Babel Errors
**Problem**: Unexpected token
**Solution**:
1. Check `.babelrc` exists and is valid JSON
2. Verify `@babel/core` is installed
3. Run `npm install --save-dev @babel/core @babel/preset-env`

### Timeout Errors
**Problem**: Test times out
**Solution**:
1. Increase timeout: `jest.setTimeout(30000);` in test file
2. Check for infinite loops in algorithm
3. Profile to find slow operations

## Adding New Tests

### Template for New Test

```javascript
describe('NewFunctionName', () => {
  test('should handle specific scenario', () => {
    // Arrange - set up test data
    const players = createMockPlayers(6, true);
    
    // Act - call the function
    const result = generateNewMatches(players);
    
    // Assert - verify results
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });
});
```

### Integration with CI/CD

Add to your CI pipeline:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm test -- --coverage
```

## Best Practices

1. **Test One Thing**: Each test should verify one behavior
2. **Use Descriptive Names**: Test names should explain what is being tested
3. **Arrange-Act-Assert**: Follow the AAA pattern in all tests
4. **Mock External Data**: Use mock players instead of real data
5. **Test Edge Cases**: Test boundaries and error conditions
6. **Keep Tests Fast**: Avoid unnecessary delays or complex operations

## References

- [Jest Documentation](https://jestjs.io/)
- [Babel Documentation](https://babeljs.io/)
- [Testing Best Practices](https://jestjs.io/docs/getting-started)

## Support

For test failures or issues:
1. Review test output carefully for assertion errors
2. Check console logs with `console.log()` in tests
3. Use `--verbose` flag for detailed output
4. Review the specific test case logic
5. Verify mock data is realistic

## Next Steps

After tests pass:
- ✅ Phase 6: Unit tests complete
- ⏳ Phase 7: Player substitution system
- ⏳ Phase 8: Tournament bracket/playoff format
