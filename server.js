const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

// Middleware to parse JSON body with increased size limit (50MB)
app.use(express.json({ limit: '500mb' }));

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Function to load a dataset by filename
const loadDataset = (filename) => {
  try {
    const dataPath = path.join(__dirname, 'data', 'datasets', filename);
    return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  } catch (error) {
    console.error(`Error loading dataset ${filename}:`, error);
    return null;
  }
};

// Function to save a dataset to file
const saveDataset = (filename, data) => {
  try {
    const dataPath = path.join(__dirname, 'data', 'datasets', filename);
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error saving dataset ${filename}:`, error);
    return false;
  }
};

// Function to get dataset registry
const getDatasetRegistry = () => {
  try {
    const registryPath = path.join(__dirname, 'data', 'dataset-registry.json');
    return JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  } catch (error) {
    console.error('Error loading dataset registry:', error);
    return [];
  }
};

// Function to save dataset registry
const saveDatasetRegistry = (registry) => {
  try {
    const registryPath = path.join(__dirname, 'data', 'dataset-registry.json');
    fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving dataset registry:', error);
    return false;
  }
};

// API endpoint to get list of available datasets
app.get('/api/datasets', (req, res) => {
  try {
    const registry = getDatasetRegistry();
    res.json(registry);
  } catch (error) {
    console.error('Error retrieving dataset list:', error);
    res.status(500).json({ error: 'Failed to retrieve dataset list' });
  }
});

// API endpoint to get all datasets with their data
app.get('/api/datasets/all', (req, res) => {
  try {
    const registry = getDatasetRegistry();
    const allDatasets = [];

    for (const dataset of registry) {
      const datasetData = loadDataset(dataset.filename);
      if (datasetData) {
        allDatasets.push(datasetData);
      }
    }

    res.json(allDatasets);
  } catch (error) {
    console.error('Error retrieving all datasets:', error);
    res.status(500).json({ error: 'Failed to retrieve all datasets' });
  }
});

// API endpoint to get a specific dataset by name
app.get('/api/datasets/:name', (req, res) => {
  try {
    const datasetName = req.params.name;
    const registry = getDatasetRegistry();

    // Find the dataset entry in the registry
    const datasetEntry = registry.find(d => d.name.toLowerCase() === datasetName.toLowerCase());

    if (!datasetEntry) {
      return res.status(404).json({ error: `Dataset '${datasetName}' not found` });
    }

    // Load the dataset from file
    const dataset = loadDataset(datasetEntry.filename);

    if (!dataset) {
      return res.status(500).json({ error: `Failed to load dataset '${datasetName}'` });
    }

    res.json(dataset);
  } catch (error) {
    console.error('Error reading dataset:', error);
    res.status(500).json({ error: 'Failed to retrieve dataset' });
  }
});

// API endpoint to create a new dataset
app.post('/api/datasets', (req, res) => {
  try {
    const { name, description, data } = req.body;

    if (!name || !description) {
      return res.status(400).json({ error: 'Name and description are required' });
    }

    // Create a valid filename from the dataset name
    const filename = name.toLowerCase().replace(/\s+/g, '-') + '.json';

    // Check if dataset with same name already exists
    const registry = getDatasetRegistry();
    if (registry.some(d => d.name.toLowerCase() === name.toLowerCase())) {
      return res.status(409).json({ error: `Dataset '${name}' already exists` });
    }

    // Create the dataset object
    const dataset = {
      dataSetName: name,
      data: data || { events: [] }
    };

    // Save the dataset to file
    if (!saveDataset(filename, dataset)) {
      return res.status(500).json({ error: 'Failed to save dataset' });
    }

    // Update the registry
    registry.push({
      name,
      filename,
      description
    });

    if (!saveDatasetRegistry(registry)) {
      return res.status(500).json({ error: 'Failed to update dataset registry' });
    }

    res.status(201).json({
      message: 'Dataset created successfully',
      dataset: { name, filename, description }
    });
  } catch (error) {
    console.error('Error creating dataset:', error);
    res.status(500).json({ error: 'Failed to create dataset' });
  }
});

// API endpoint to update an existing dataset
app.put('/api/datasets/:name', (req, res) => {
  try {
    const datasetName = req.params.name;
    const { name, description, data } = req.body;

    if ((!name && !description && !data)) {
      return res.status(400).json({ error: 'No update information provided' });
    }

    // Get the registry and find the dataset
    const registry = getDatasetRegistry();
    const datasetIndex = registry.findIndex(d => d.name.toLowerCase() === datasetName.toLowerCase());

    if (datasetIndex === -1) {
      return res.status(404).json({ error: `Dataset '${datasetName}' not found` });
    }

    const datasetEntry = registry[datasetIndex];
    const dataset = loadDataset(datasetEntry.filename);

    if (!dataset) {
      return res.status(500).json({ error: `Failed to load dataset '${datasetName}'` });
    }

    // Update the dataset
    let newFilename = datasetEntry.filename;

    // If name is changed, create a new filename and update registry
    if (name && name !== datasetEntry.name) {
      // Check if new name already exists (excluding current dataset)
      if (registry.some(d => d.name.toLowerCase() === name.toLowerCase() && d.name.toLowerCase() !== datasetName.toLowerCase())) {
        return res.status(409).json({ error: `Dataset name '${name}' already exists` });
      }

      newFilename = name.toLowerCase().replace(/\s+/g, '-') + '.json';
      dataset.dataSetName = name;
      registry[datasetIndex].name = name;
      registry[datasetIndex].filename = newFilename;
    }

    // Update description if provided
    if (description) {
      registry[datasetIndex].description = description;
    }

    // Update data if provided
    if (data) {
      dataset.data = data;
    }

    // Save the dataset with updated information
    if (!saveDataset(newFilename, dataset)) {
      return res.status(500).json({ error: 'Failed to save updated dataset' });
    }

    // If filename changed, delete the old file
    if (newFilename !== datasetEntry.filename) {
      const oldFilePath = path.join(__dirname, 'data', 'datasets', datasetEntry.filename);
      try {
        fs.unlinkSync(oldFilePath);
      } catch (error) {
        console.error(`Error deleting old dataset file ${datasetEntry.filename}:`, error);
      }
    }

    // Save the updated registry
    if (!saveDatasetRegistry(registry)) {
      return res.status(500).json({ error: 'Failed to update dataset registry' });
    }

    res.json({
      message: 'Dataset updated successfully',
      dataset: registry[datasetIndex]
    });
  } catch (error) {
    console.error('Error updating dataset:', error);
    res.status(500).json({ error: 'Failed to update dataset' });
  }
});

// API endpoint to delete a dataset
app.delete('/api/datasets/:name', (req, res) => {
  try {
    const datasetName = req.params.name;

    // Get the registry and find the dataset
    const registry = getDatasetRegistry();
    const datasetIndex = registry.findIndex(d => d.name.toLowerCase() === datasetName.toLowerCase());

    if (datasetIndex === -1) {
      return res.status(404).json({ error: `Dataset '${datasetName}' not found` });
    }

    const datasetEntry = registry[datasetIndex];

    // Delete the dataset file
    const filePath = path.join(__dirname, 'data', 'datasets', datasetEntry.filename);
    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      console.error(`Error deleting dataset file ${datasetEntry.filename}:`, error);
      return res.status(500).json({ error: 'Failed to delete dataset file' });
    }

    // Remove from registry
    registry.splice(datasetIndex, 1);

    // Save the updated registry
    if (!saveDatasetRegistry(registry)) {
      return res.status(500).json({ error: 'Failed to update dataset registry' });
    }

    res.json({
      message: 'Dataset deleted successfully',
      dataset: datasetEntry
    });
  } catch (error) {
    console.error('Error deleting dataset:', error);
    res.status(500).json({ error: 'Failed to delete dataset' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
