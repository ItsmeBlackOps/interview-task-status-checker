# Interview Task Status Checker

A comprehensive tool designed to monitor, validate, and correct interview task statuses and data integrity.

## Core Workflows

This application is built to streamline the workflow for data quality assurance. The primary workflows for assigned team members are as follows:

### 1. Anomaly Monitor (Status Correction) / Task Feed
- **Purpose**: To verify and correct the status of interview tasks.
- **Action**: Check the "Anomaly Monitor" or "Task Feed" to identify tasks with incorrect or outdated statuses. Use the interface to update them to the correct state (e.g., from "Pending" to "Completed" or "Rejected").

### 2. Validations Tab (Format Check)
- **Purpose**: To ensure all task data adheres to the required format.
- **Action**: detailed in the "Validations" tab, identify tasks that are "not in format" or missing required fields. These tasks need to be reviewed so that the relevant team members can be notified to revert/fix the data entry.

### 3. Mismatch Tab (Round Integrity)
- **Purpose**: To resolve discrepancies in interview round values.
- **Action**: The "Mismatch" tab highlights valid tasks where the recorded round (e.g., in the database) does not match the round extracted from the interview confirmation proof (e.g., email subject/body).
- **Workflow**: Review the evidence provided in the tab and correct the round value to match the actual interview stage.

## Features
- **Streaming Data Feeds**: Real-time data loading for large datasets.
- **Lazy Loading**: Efficient scrolling for performance.
- **Direct Editing**: Fix statuses and round discrepancies directly from the UI.
- **Evidence Verification**: View email proofs and conversation history to validate data.

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS, Framer Motion
- **Database**: MongoDB
