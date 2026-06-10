import { useState, useEffect } from "react";
import {
  Card, Typography, Form, Select, Input, Button, message, Space,
} from "antd";
import { FlagOutlined } from "@ant-design/icons";
import api from "../../services/axiosInstance";
import { StateList } from "../../constants/locations";
import { UNICEF_COLORS } from "../../theme/unicef";

const { Title, Text } = Typography;
const { TextArea } = Input;

// For these endpoints the SAMResponse wrapper uses success===true / statusCode 200|201 to mean OK.
const isOk = (res) => {
  const d = res?.data;
  return d?.success === true || d?.statusCode === 200 || d?.statusCode === 201;
};

export default function ReportIssue() {
  const [form] = Form.useForm();
  const [surveyors, setSurveyors] = useState([]);
  const [loadingSurveyors, setLoadingSurveyors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const selectedState = Form.useWatch("state", form);

  // Fetch surveyors whenever the selected state changes
  useEffect(() => {
    if (!selectedState) {
      setSurveyors([]);
      form.setFieldsValue({ surveyorId: undefined });
      return;
    }
    let cancelled = false;
    const fetchSurveyors = async () => {
      setLoadingSurveyors(true);
      form.setFieldsValue({ surveyorId: undefined });
      try {
        const res = await api.get(
          `/admin/user-management/surveyors-by-state/${encodeURIComponent(selectedState)}`,
          { noCache: true }
        );
        if (cancelled) return;
        const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setSurveyors(list);
      } catch {
        if (!cancelled) {
          setSurveyors([]);
          message.error("Failed to fetch surveyors for this state");
        }
      } finally {
        if (!cancelled) setLoadingSurveyors(false);
      }
    };
    fetchSurveyors();
    return () => { cancelled = true; };
  }, [selectedState, form]);

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        state: values.state,
        surveyorId: Number(values.surveyorId),
        recordId: String(values.recordId).trim(),
        comment: values.comment.trim(),
      };
      const res = await api.post("/form/admin/routine-monitoring/report-issue", payload);
      if (isOk(res)) {
        message.success(res.data?.message || "Issue reported successfully");
        form.resetFields();
        setSurveyors([]);
      } else {
        message.error(res.data?.message || "Failed to report issue");
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Error submitting report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: 24, background: UNICEF_COLORS.lightGray, minHeight: "100vh" }}>
      <div style={{ marginBottom: 24 }}>
        <Space align="center" size={10}>
          <FlagOutlined style={{ fontSize: 22, color: UNICEF_COLORS.orange }} />
          <Title level={3} style={{ margin: 0, color: UNICEF_COLORS.dark }}>Report an Issue</Title>
        </Space>
        <Text style={{ display: "block", color: UNICEF_COLORS.gray, marginTop: 4 }}>
          Flag incorrect information on a routine-monitoring record and assign it to the surveyor for correction.
        </Text>
      </div>

      <Card style={{ borderRadius: 16, maxWidth: 720 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark>
          <Form.Item
            name="state"
            label="State"
            rules={[{ required: true, message: "State is required" }]}
          >
            <Select
              placeholder="Select state"
              showSearch
              optionFilterProp="label"
              options={StateList.map((s) => ({ value: s.text, label: s.text }))}
            />
          </Form.Item>

          <Form.Item
            name="surveyorId"
            label="Surveyor"
            rules={[{ required: true, message: "Surveyor is required" }]}
          >
            <Select
              placeholder={selectedState ? "Select surveyor" : "Select a state first"}
              loading={loadingSurveyors}
              disabled={!selectedState || loadingSurveyors}
              showSearch
              optionFilterProp="label"
              notFoundContent={loadingSurveyors ? "Loading..." : "No surveyors found"}
              options={surveyors.map((s) => ({
                value: s.id,
                label: s.email ? `${s.name} (${s.email})` : s.name,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="recordId"
            label="Record ID"
            rules={[{ required: true, message: "Record ID is required" }]}
          >
            <Input placeholder="Enter Routine Monitoring Record ID" />
          </Form.Item>

          <Form.Item
            name="comment"
            label="Comment"
            rules={[
              { required: true, message: "Comment is required" },
              { min: 10, message: "Comment must be at least 10 characters" },
            ]}
          >
            <TextArea rows={4} placeholder="Describe the issue with this record..." showCount />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" loading={submitting} block size="large">
              Submit Issue
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
