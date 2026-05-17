import React from 'react';

// Utility functions for handling form data with "Others" options

/**
 * Creates a comma-separated string from selected options, replacing "Others" with "Others - custom text" format
 * @param {Array} selectedOptions - Array of selected option values
 * @param {string} otherText - Custom text for "Others" option
 * @returns {string} Comma-separated string for backend
 */
export const createCommaSeperatedString = (selectedOptions, otherText = '') => {
    if (!selectedOptions || selectedOptions.length === 0) {
        return '';
    }
    
    const options = [...selectedOptions];
    
    // If "Others" is selected and there's custom text, replace "Others" with "Others - custom text"
    if (options.includes('Others') && otherText.trim()) {
        const index = options.indexOf('Others');
        options[index] = `Others - ${otherText.trim()}`;
    } else if (options.includes('Others') && !otherText.trim()) {
        // If "Others" is selected but no text provided, keep "Others"
        // This should be caught by validation
    }
    
    return options.join(', ');
};

/**
 * Hook for managing checkbox groups with "Others" option
 * @param {string} fieldName - Name of the field
 * @param {string} otherFieldName - Name of the "Other" text field
 * @param {Array} initialOptions - Initial selected options (default: [])
 * @param {string} initialOtherText - Initial other text (default: '')
 * @returns {object} State and handlers for checkbox group
 */
export const useCheckboxGroupWithOthers = (fieldName, otherFieldName, initialOptions = [], initialOtherText = '') => {
    const [selectedOptions, setSelectedOptions] = React.useState(initialOptions || []);
    const [otherText, setOtherText] = React.useState(initialOtherText || '');

    const handleOptionChange = (event) => {
        const { value, checked } = event.target;
        if (checked) {
            setSelectedOptions(prev => [...(prev || []), value]);
        } else {
            setSelectedOptions(prev => (prev || []).filter(option => option !== value));
            // Clear other text if "Others" is unchecked
            if (value === 'others') {
                setOtherText('');
            }
        }
    };

    const handleOtherTextChange = (event) => {
        setOtherText(event.target.value || '');
    };

    const getCommaSeperatedValue = () => {
        return createCommaSeperatedString(selectedOptions || [], otherText || '');
    };

    return {
        selectedOptions: selectedOptions || [],
        otherText: otherText || '',
        handleOptionChange,
        handleOtherTextChange,
        getCommaSeperatedValue,
        showOtherField: (selectedOptions || []).includes('others')
    };
};

/**
 * Hook for managing radio groups with "Others" option
 * @param {string} fieldName - Name of the field
 * @param {string} otherFieldName - Name of the "Other" text field
 * @param {string} initialOption - Initial selected option (default: '')
 * @param {string} initialOtherText - Initial other text (default: '')
 * @returns {object} State and handlers for radio group
 */
export const useRadioGroupWithOthers = (fieldName, otherFieldName, initialOption = '', initialOtherText = '') => {
    const [selectedOption, setSelectedOption] = React.useState(initialOption || '');
    const [otherText, setOtherText] = React.useState(initialOtherText || '');

    const handleOptionChange = (event) => {
        const { value } = event.target;
        setSelectedOption(value || '');
        // Clear other text if not "Others"
        if (value !== 'Others') {
            setOtherText('');
        }
    };

    const handleOtherTextChange = (event) => {
        setOtherText(event.target.value || '');
    };

    const getFinalValue = () => {
        if ((selectedOption || '') === 'Others' && (otherText || '').trim()) {
            return `Others - ${(otherText || '').trim()}`;
        }
        return selectedOption || '';
    };

    return {
        selectedOption: selectedOption || '',
        otherText: otherText || '',
        handleOptionChange,
        handleOtherTextChange,
        getFinalValue,
        showOtherField: (selectedOption || '') === 'Others'
    };
};

/**
 * Creates validation schema for fields with "Others" option
 * @param {string} mainFieldType - 'array' for checkboxes, 'string' for radio
 * @param {string} mainFieldName - Name of the main field
 * @param {string} otherFieldName - Name of the "Other" text field
 * @param {boolean} isRequired - Whether the main field is required
 * @returns {object} Yup validation schema
 */
export const createOthersValidation = (mainFieldType, mainFieldName, otherFieldName, isRequired = true) => {
    const Yup = require('yup');
    
    const schema = {};
    
    if (mainFieldType === 'array') {
        schema[mainFieldName] = isRequired 
            ? Yup.array().min(1, "Please select at least one option")
            : Yup.array();
            
        schema[otherFieldName] = Yup.string().when(mainFieldName, 
            (options, schema) => {
                return options && options.includes('Others')
                    ? schema.max(200, "Must be at most 200 characters").required("Please specify other option")
                    : schema.max(200, "Must be at most 200 characters");
            }
        );
    } else {
        schema[mainFieldName] = isRequired 
            ? Yup.string().required("This is a required field")
            : Yup.string();
            
        schema[otherFieldName] = Yup.string().when(mainFieldName, 
            (option, schema) => {
                return option === 'Others'
                    ? schema.max(200, "Must be at most 200 characters").required("Please specify other option")
                    : schema.max(200, "Must be at most 200 characters");
            }
        );
    }
    
    return schema;
}; 
