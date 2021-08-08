# Changelog
All notable changes to this project will be documented in this file.

## [Unreleased]

## [0.4.1] - 2020-08-09
### Changed
- Changed getBalance response returning confirmed and unconfirmed balance
- Added calculateExpectedFees function

## [0.4.0] - 2020-07-25
### Changed
- Increased fee for jupiter-fs binary transactions

### Added
- Added function to get all the transactions with jupiter-fs metadata

## [0.3.1] - 2020-07-15
### Changed
- Update getAllTransactions function to support jupiter metis subtypes

## [0.3.0] - 2020-07-15
### Changed
- Update storeRecord function to support jupiter metis subtypes

## [0.2.1] - 2020-07-07
### Added
- Added Changelog file
- Added getTransaction request

### Changed
- Update metadata after fork from [moontography github](https://github.com/moontography/jupiter-node-sdk)
- Transaction fee now is calcualated dynamically based on the ancrypted message size

## [0.2.0] - 2020-07-04
### Added

### Changed
- Update encryption algo to aes-256-cbc

### Removed
