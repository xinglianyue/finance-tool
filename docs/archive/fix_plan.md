# Fix Plan for index-new.html

## Issues Identified

### 1. buildV3Data signature mismatch
**Current:** `function buildV3Data(cloudData)`
**Called from loadFromCloud:** `buildV3Data(cloudRecords, cloudIndex)`
**Fix:** Change to `function buildV3Data(cloudRecords, cloudIndex)` and use both parameters appropriately

### 2. loadFromCloud syntax error
**Current code contains:**
```javascript
const hasUpdate = await checkCloudForUpdates(localData);
if (hasUpdate) async function checkCloudForUpdates(localData) {
  // function body
}
```
**Problem:** Redefining checkCloudForUpdates inside an if-block with `async function` declaration is invalid
**Fix:** Remove the nested function definition. checkCloudForUpdates is already defined separately just call it properly

### 3. switchImportDate missing importHistory scope
**Current:** Uses `importHistory.length` directly
**Problem:** importHistory is not global, it's part of the V3 data structure
**Fix:** Either pass importHistory via DataStore or get it from loaded data

### 4. Missing proper fetch flow in loadFromCloud for first-time load
When localData is not v3 format, loadFromCloud fetches index.json + shared-data.json but buildV3Data needs to handle both properly

## Corrections Needed

### For loadFromCloud function:
```javascript
function loadFromCloud() {
  console.log('[App] 开始加载云端数据 (V3模式)');
  const localData = DataStore.load();
  if (!localData || !localData.metadata || localData.version !== 3) {
    try {
      const indexResponse = await fetch('./index.json');
      const cloudIndex = await indexResponse.json();
      const dataResponse = await fetch('./shared-data.json');
      const cloudRecords = await dataResponse.json();
      const v3Data = buildV3Data(cloudRecords, cloudIndex);
      DataStore.save(v3Data);
      return v3Data;
    } catch (e) {
      console.error('[App] 加载云端数据失败:', e);
      throw e;
    }
  }
  // Check for updates
  const hasUpdate = await checkCloudForUpdates(localData);
  if (hasUpdate) {
    // Need to fetch updated data
    const indexResponse = await fetch('./index.json');
    const cloudIndex = await indexResponse.json();
    const dataResponse = await fetch('./shared-data.json');
    const cloudRecords = await dataResponse.json();
    const v3Data = buildV3Data(cloudRecords, cloudIndex);
    DataStore.save(v3Data);
    return v3Data;
  }
  return localData;
}
```

### For buildV3Data function:
```javascript
function buildV3Data(cloudRecords, cloudIndex) {
  const metadata = {
    lastSyncAt: new Date().toISOString(),
    cloudVersion: cloudIndex?.version || 'v1',
    availableDates: cloudIndex?.records?.map(r => r.date) || []
  };
  const currentData = parseRecord(cloudRecords[0]);
  // ... rest of implementation
}
```

### For switchImportDate:
Need to access importHistory from the current data state, not globally.