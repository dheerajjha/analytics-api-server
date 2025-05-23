# Events API Server

A simple API server that serves event datasets from individual JSON files with a UI for CRUD operations.

## Setup

1. Install dependencies:
```
cd api-server
npm install
```

2. Start the server:
```
npm start
```

The server will run on port 80 by default. You can change the port by setting the PORT environment variable.

## Web UI

The server includes a web-based dashboard that allows you to:

- Browse available datasets
- Create new datasets
- Update existing datasets
- Delete datasets

Access the dashboard at `http://localhost:80/` after starting the server.

## API Endpoints

### Get Dataset List

```
GET /api/datasets
```

Returns a list of available datasets with metadata (name, filename, description).

### Get All Datasets with Data

```
GET /api/datasets/all
```

Returns all available datasets with their full event data.

### Get Dataset by Name

```
GET /api/datasets/:name
```

Returns a specific dataset by name. The name is case-insensitive.

Examples:
- `/api/datasets/Car Rentals`
- `/api/datasets/Payments Feature`

### Create Dataset

```
POST /api/datasets
```

Creates a new dataset. The request body should contain:
- `name`: Display name of the dataset
- `description`: Brief description of the dataset
- `data` (optional): Initial events data

### Update Dataset

```
PUT /api/datasets/:name
```

Updates an existing dataset. The request body can contain:
- `name` (optional): New display name of the dataset
- `description` (optional): New description of the dataset
- `data` (optional): Updated events data

### Delete Dataset

```
DELETE /api/datasets/:name
```

Deletes a dataset by name.

## Data Structure

Each dataset contains:
- `dataSetName`: The name of the dataset
- `data.events`: An array of events with their details

## File Structure

- `data/dataset-registry.json`: Contains the list of all available datasets
- `data/datasets/`: Directory containing individual dataset files
  - `car-rentals.json`: Car Rentals dataset
  - `payments-feature.json`: Payments Feature dataset

## Adding New Datasets

To add a new dataset:

1. Create a new JSON file in the `data/datasets/` directory
2. Add an entry to the `data/dataset-registry.json` file with:
   - `name`: Display name of the dataset
   - `filename`: Filename of the dataset JSON file
   - `description`: Brief description of the dataset

## Modifying the Data

To modify the datasets, edit the JSON file at `data/datasets.json`.
