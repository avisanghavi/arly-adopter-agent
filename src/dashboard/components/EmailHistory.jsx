import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Pagination,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  Email as EmailIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Schedule as PendingIcon,
  Visibility as ViewIcon,
  Mouse as ClickIcon,
  PersonAdd as ConversionIcon,
  Info as InfoIcon
} from '@mui/icons-material';

const EmailHistory = () => {
  const [emails, setEmails] = useState([]);
  const [stats, setStats] = useState({
    overall: {
      sent: { sent: 0, opens: 0, clicks: 0, conversions: 0 },
      delivered: { sent: 0, opens: 0, clicks: 0, conversions: 0 },
      failed: { sent: 0, opens: 0, clicks: 0, conversions: 0 }
    },
    today: { sent: 0, opens: 0, clicks: 0, conversions: 0 }
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEmails = async (pageNum) => {
    try {
      const response = await fetch(`/api/email-tracking/history?page=${pageNum}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch email history');
      const data = await response.json();
      setEmails(data.emails);
      setTotalPages(data.pagination.pages);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/email-tracking/stats', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch email statistics');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([fetchEmails(page), fetchStats()]);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [page]);

  const handlePageChange = (event, value) => {
    setPage(value);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent':
        return <SuccessIcon sx={{ color: 'success.main' }} />;
      case 'failed':
        return <ErrorIcon sx={{ color: 'error.main' }} />;
      case 'delivered':
        return <CheckCircle sx={{ color: 'info.main' }} />;
      default:
        return <PendingIcon sx={{ color: 'warning.main' }} />;
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  const getConversionRate = (clicks) => {
    if (!clicks || clicks.length === 0) return 0;
    const conversions = clicks.filter(click => click.converted).length;
    return ((conversions / clicks.length) * 100).toFixed(1);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box m={2}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Statistics Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2 }}>
            <Typography variant="h6" color="textSecondary">
              Today's Activity
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">Sent: {stats.today.sent}</Typography>
              <Typography variant="body2" color="text.secondary">Opens: {stats.today.opens}</Typography>
              <Typography variant="body2" color="text.secondary">Clicks: {stats.today.clicks}</Typography>
              <Typography variant="body2" color="text.secondary">Conversions: {stats.today.conversions || 0}</Typography>
            </Box>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2 }}>
            <Typography variant="h6" color="textSecondary">
              Total Sent
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="h4">{stats.overall.sent?.sent || 0}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <ViewIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {stats.overall.sent?.opens || 0} opens
                </Typography>
              </Box>
            </Box>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2 }}>
            <Typography variant="h6" color="textSecondary">
              Engagement
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="h4">{stats.overall.delivered?.clicks || 0}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <ConversionIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {stats.overall.delivered?.conversions || 0} signups
                </Typography>
              </Box>
            </Box>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2 }}>
            <Typography variant="h6" color="textSecondary">
              Conversion Rate
            </Typography>
            <Typography variant="h4" color="primary.main">
              {((stats.overall.delivered?.conversions || 0) / (stats.overall.delivered?.clicks || 1) * 100).toFixed(1)}%
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Email History Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Status</TableCell>
              <TableCell>Recipient</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell>Sent At</TableCell>
              <TableCell>Opens</TableCell>
              <TableCell>Clicks</TableCell>
              <TableCell>Conversions</TableCell>
              <TableCell>Template</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {emails.map((email) => (
              <TableRow key={email.messageId}>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getStatusIcon(email.status)}
                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                      {email.status}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{email.recipient}</TableCell>
                <TableCell>{email.subject}</TableCell>
                <TableCell>{formatDate(email.sentAt)}</TableCell>
                <TableCell>{email.openCount || 0}</TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    {email.clicks?.length || 0}
                    {email.clicks?.length > 0 && (
                      <Tooltip title={`Last clicked: ${formatDate(email.clicks[email.clicks.length - 1].timestamp)}`}>
                        <IconButton size="small">
                          <InfoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    {email.clicks?.filter(click => click.converted).length || 0}
                    {email.clicks?.some(click => click.converted) && (
                      <Tooltip title={`Conversion rate: ${getConversionRate(email.clicks)}%`}>
                        <IconButton size="small" color="success">
                          <ConversionIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  {email.metadata?.template ? (
                    <Chip
                      label={email.metadata.template}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  ) : (
                    '-'
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <Box display="flex" justifyContent="center" mt={3}>
        <Pagination
          count={totalPages}
          page={page}
          onChange={handlePageChange}
          color="primary"
        />
      </Box>
    </Container>
  );
};

export default EmailHistory; 