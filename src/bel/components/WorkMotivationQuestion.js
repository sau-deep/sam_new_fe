import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  EmojiEmotions as AlwaysIcon,
  Mood as VeryOftenIcon,
  SentimentSatisfied as OftenIcon,
  SentimentNeutral as SometimesIcon,
  SentimentDissatisfied as RarelyIcon,
  SentimentVeryDissatisfied as NeverIcon
} from '@mui/icons-material';

const QuestionCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
  borderRadius: '12px',
  border: '1px solid rgba(255,255,255,0.2)',
  background: 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
  '&:hover': {
    boxShadow: '0 8px 25px rgba(0,0,0,0.12)',
    transform: 'translateY(-1px)',
    transition: 'all 0.3s ease'
  }
}));

const OptionBox = styled(Box)(({ theme, selected, color, bgColor }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(1.5),
  margin: theme.spacing(0.5),
  borderRadius: '12px',
  backgroundColor: bgColor,
  color: 'white',
  border: selected ? '2px solid #000' : '2px solid transparent',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  minWidth: '120px',
  minHeight: '100px',
  boxShadow: selected 
    ? `0 6px 20px ${bgColor}60, 0 0 0 1px #fff` 
    : '0 4px 12px rgba(0,0,0,0.08)',
  transform: selected ? 'scale(1.02)' : 'scale(1)',
  '&:hover': {
    transform: 'scale(1.05)',
    boxShadow: `0 6px 20px ${bgColor}50`,
    '& .icon': {
      transform: 'scale(1.1)'
    }
  },
  '& .icon': {
    fontSize: '2rem',
    marginBottom: theme.spacing(0.5),
    transition: 'transform 0.3s ease'
  },
  '& .label': {
    fontSize: '0.85rem',
    fontWeight: 600,
    textAlign: 'center',
    lineHeight: 1.1
  },
  '& .description': {
    fontSize: '0.65rem',
    opacity: 0.9,
    textAlign: 'center',
    marginTop: theme.spacing(0.3)
  },
  [theme.breakpoints.down('md')]: {
    minWidth: '100px',
    minHeight: '85px',
    padding: theme.spacing(1),
    margin: theme.spacing(0.3),
    '& .icon': {
      fontSize: '1.8rem'
    },
    '& .label': {
      fontSize: '0.75rem'
    },
    '& .description': {
      fontSize: '0.55rem'
    }
  },
  [theme.breakpoints.down('sm')]: {
    minWidth: '85px',
    minHeight: '75px',
    padding: theme.spacing(0.8),
    '& .icon': {
      fontSize: '1.6rem'
    },
    '& .label': {
      fontSize: '0.7rem'
    },
    '& .description': {
      fontSize: '0.5rem'
    }
  }
}));

const WorkMotivationQuestion = ({ value, onChange, showTitle = true }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const options = [
    {
      key: 'always',
      label: 'Always',
      description: 'Every day',
      icon: AlwaysIcon,
      color: '#2e7d32', // Dark green
      bgColor: '#4caf50'
    },
    {
      key: 'very_often',
      label: 'Very Often',
      description: '4-5 days a week',
      icon: VeryOftenIcon,
      color: '#388e3c',
      bgColor: '#66bb6a'
    },
    {
      key: 'often',
      label: 'Often',
      description: '2-3 days a week',
      icon: OftenIcon,
      color: '#689f38',
      bgColor: '#8bc34a'
    },
    {
      key: 'sometimes',
      label: 'Sometimes',
      description: 'Once a week',
      icon: SometimesIcon,
      color: '#f57c00',
      bgColor: '#ff9800'
    },
    {
      key: 'rarely',
      label: 'Rarely',
      description: 'Few times a month',
      icon: RarelyIcon,
      color: '#e64a19',
      bgColor: '#ff5722'
    },
    {
      key: 'never',
      label: 'Never',
      description: '',
      icon: NeverIcon,
      color: '#c62828',
      bgColor: '#f44336'
    }
  ];

  const handleOptionClick = (optionKey) => {
    onChange(optionKey);
  };

  return (
    <QuestionCard>
      <CardContent sx={{ p: 2 }}>
        {showTitle && (
          <Typography 
            variant={isMobile ? "h6" : "h5"} 
            gutterBottom 
            sx={{ 
              color: '#1976d2', 
              fontWeight: 700, 
              mb: 2,
              textAlign: 'center'
            }}
          >
            💼 Work Motivation Survey
          </Typography>
        )}
        
        <Box sx={{ mb: 2 }}>
          <Typography 
            variant={isMobile ? "body1" : "h6"} 
            gutterBottom 
            sx={{ 
              fontWeight: 600,
              color: '#333',
              textAlign: 'center',
              mb: 1.5
            }}
          >
            Q1. How often do you feel enthusiastic and motivated about your work at BEL?
          </Typography>
          
          <Typography 
            variant="body2" 
            sx={{ 
              color: '#666',
              textAlign: 'center',
              fontStyle: 'italic'
            }}
          >
            Please select the option that best describes your experience
          </Typography>
        </Box>

        <Box 
          sx={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            justifyContent: 'center',
            gap: 0.5,
            mt: 2
          }}
        >
          {options.map((option) => {
            const IconComponent = option.icon;
            const isSelected = value === option.key;
            
            return (
              <OptionBox
                key={option.key}
                selected={isSelected}
                color={option.color}
                bgColor={option.bgColor}
                onClick={() => handleOptionClick(option.key)}
              >
                <IconComponent className="icon" />
                <div className="label">{option.label}</div>
                {option.description && (
                  <div className="description">({option.description})</div>
                )}
              </OptionBox>
            );
          })}
        </Box>

        {value && (
          <Box 
            sx={{ 
              mt: 2, 
              p: 1.5, 
              backgroundColor: '#e8f5e8', 
              borderRadius: '8px',
              textAlign: 'center'
            }}
          >
            <Typography variant="body1" sx={{ color: '#2e7d32', fontWeight: 600 }}>
              ✅ Selected: {options.find(opt => opt.key === value)?.label}
              {options.find(opt => opt.key === value)?.description && 
                ` (${options.find(opt => opt.key === value)?.description})`
              }
            </Typography>
          </Box>
        )}
      </CardContent>
    </QuestionCard>
  );
};

export default WorkMotivationQuestion;