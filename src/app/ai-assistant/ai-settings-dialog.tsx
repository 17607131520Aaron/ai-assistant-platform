"use client";

import {
  ApiOutlined,
  BgColorsOutlined,
  CloseOutlined,
  GithubOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import {
  Button,
  ConfigProvider,
  Form,
  Input,
  Modal,
  Segmented,
  Space,
  Switch,
  Tabs,
  Typography,
  theme,
} from "antd";
import React, { useEffect, useState } from "react";

import {
  deleteApiKeyConfig,
  fetchApiKeyConfig,
  migrateLegacyLocalSettings,
  saveApiKeyConfig,
  type WebAiApiKeyConfig,
} from "@/lib/ai-api-key-config";
import { getAccessToken } from "@/lib/auth-token";

type AiSettingsDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfigSaved?: () => void;
};

type FormSettings = {
  requestUrl: string;
  model: string;
  apiKeyToken: string;
};

const defaultFormSettings: FormSettings = {
  requestUrl: "",
  model: "",
  apiKeyToken: "",
};

const AiSettingsDialog: React.FC<AiSettingsDialogProps> = ({
  open,
  onClose,
  onConfigSaved,
}) => {
  const [settings, setSettings] = useState<FormSettings>(defaultFormSettings);
  const [remoteConfig, setRemoteConfig] = useState<WebAiApiKeyConfig | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState("ai");
  const [gitlabToken, setGitlabToken] = useState("");
  const [autoPublish, setAutoPublish] = useState(true);
  const [themeMode, setThemeMode] = useState("dark");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [testState, setTestState] = useState<"idle" | "missing" | "ready">(
    "idle",
  );

  const configured = Boolean(
    settings.requestUrl.trim() &&
      (settings.model.trim() || remoteConfig?.model) &&
      (settings.apiKeyToken.trim() || remoteConfig?.hasApiKeyToken),
  );

  const resetFeedback = () => {
    setSaved(false);
    setTestState("idle");
    setError("");
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    const loadConfig = async () => {
      setLoading(true);
      setError("");
      resetFeedback();

      try {
        if (!getAccessToken()) {
          setRemoteConfig(null);
          setSettings(defaultFormSettings);
          setError("请先登录后再配置 AI API Key");
          return;
        }

        await migrateLegacyLocalSettings();
        const config = await fetchApiKeyConfig();

        if (cancelled) {
          return;
        }

        setRemoteConfig(config);
        setSettings({
          requestUrl: config.requestUrl,
          model: config.model,
          apiKeyToken: "",
        });
      } catch (exception) {
        if (!cancelled) {
          setError(
            exception instanceof Error
              ? exception.message
              : "加载 AI API Key 配置失败",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadConfig();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleRequestUrlChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    resetFeedback();
    setSettings((current) => ({ ...current, requestUrl: event.target.value }));
  };

  const handleModelChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    resetFeedback();
    setSettings((current) => ({ ...current, model: event.target.value }));
  };

  const handleApiKeyTokenChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    resetFeedback();
    setSettings((current) => ({
      ...current,
      apiKeyToken: event.target.value,
    }));
  };

  const handleSave = async () => {
    const requestUrl = settings.requestUrl.trim();
    const model = settings.model.trim() || remoteConfig?.model?.trim() || "";
    const apiKeyToken = settings.apiKeyToken.trim();

    if (!requestUrl) {
      setError("请填写请求 URL");
      setTestState("missing");
      return;
    }

    if (!model) {
      setError("请填写模型名称");
      setTestState("missing");
      return;
    }

    if (!apiKeyToken && !remoteConfig?.hasApiKeyToken) {
      setError("请填写 API Key Token");
      setTestState("missing");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const config = await saveApiKeyConfig(
        requestUrl,
        model,
        apiKeyToken || undefined,
      );
      setRemoteConfig(config);
      setSettings({
        requestUrl: config.requestUrl,
        model: config.model,
        apiKeyToken: "",
      });
      setSaved(true);
      setTestState("idle");
      onConfigSaved?.();
    } catch (exception) {
      setError(
        exception instanceof Error ? exception.message : "保存配置失败",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    setError("");

    try {
      const config = await deleteApiKeyConfig();
      setRemoteConfig(config);
      setSettings(defaultFormSettings);
      setSaved(false);
      setTestState("idle");
      onConfigSaved?.();
    } catch (exception) {
      setError(
        exception instanceof Error ? exception.message : "清除配置失败",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleTest = () => {
    setTestState(configured ? "ready" : "missing");
  };

  const apiKeyPlaceholder = remoteConfig?.hasApiKeyToken
    ? `已配置 ${remoteConfig.apiKeyTokenMasked}，输入新值可覆盖`
    : "输入 API Key Token...";

  const aiConfigContent = (
    <Form layout="vertical" requiredMark={false} className="pt-1">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium">
        <Typography.Text type="secondary">自定义 API Key</Typography.Text>
        <Typography.Text type={configured ? "success" : "secondary"}>
          {configured ? "已配置" : "未配置"}
        </Typography.Text>
        {remoteConfig?.updatedAt && (
          <Typography.Text type="secondary" className="text-xs">
            更新于 {new Date(remoteConfig.updatedAt).toLocaleString()}
          </Typography.Text>
        )}
      </div>

      <Form.Item label="请求 URL">
        <Input
          type="url"
          value={settings.requestUrl}
          onChange={handleRequestUrlChange}
          placeholder="https://api.sensenova.cn/v1/llm/chat-completions"
          disabled={loading || saving}
        />
      </Form.Item>

      <Form.Item label="模型名称">
        <Input
          value={settings.model}
          onChange={handleModelChange}
          placeholder="SenseNova-V6.7-Flash-Lite（以控制台模型 ID 为准）"
          disabled={loading || saving}
        />
      </Form.Item>

      <Form.Item label="API Key Token">
        <Space.Compact className="w-full">
          <Input.Password
            value={settings.apiKeyToken}
            onChange={handleApiKeyTokenChange}
            placeholder={apiKeyPlaceholder}
            disabled={loading || saving}
          />
          <Button
            icon={<SaveOutlined />}
            onClick={() => void handleSave()}
            loading={saving}
            disabled={loading}
          >
            保存
          </Button>
        </Space.Compact>
      </Form.Item>

      <Space size={12} align="center" wrap>
        <Button
          size="small"
          type="primary"
          ghost
          onClick={handleTest}
          disabled={loading || saving}
        >
          测试连接
        </Button>
        {remoteConfig?.hasApiKeyToken && (
          <Button
            size="small"
            danger
            ghost
            onClick={() => void handleClear()}
            loading={saving}
            disabled={loading}
          >
            清除配置
          </Button>
        )}
        {saved && (
          <Typography.Text type="success" className="text-xs">
            配置已保存到服务端
          </Typography.Text>
        )}
        {error && (
          <Typography.Text type="danger" className="text-xs">
            {error}
          </Typography.Text>
        )}
        {testState === "missing" && !error && (
          <Typography.Text type="warning" className="text-xs">
            请先填写请求 URL、模型名称和 API Key Token
          </Typography.Text>
        )}
        {testState === "ready" && !error && (
          <Typography.Text type="success" className="text-xs">
            配置项完整，可发起连接测试
          </Typography.Text>
        )}
      </Space>
    </Form>
  );

  const gitlabContent = (
    <div className="space-y-4 pt-1">
      <Form layout="vertical" requiredMark={false}>
        <Form.Item label="GitLab Personal Access Token">
          <Space.Compact className="w-full">
            <Input.Password
              value={gitlabToken}
              onChange={(event) => setGitlabToken(event.target.value)}
              placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
            />
            <Button icon={<SaveOutlined />}>保存</Button>
          </Space.Compact>
        </Form.Item>
        <Button size="small" type="primary" ghost style={{ marginBottom: 12 }}>
          测试 GitLab 连接
        </Button>
      </Form>

      <div className="flex items-center justify-between rounded-lg border border-[#343356] bg-[#292a4a] px-4 py-3">
        <div>
          <Typography.Text className="block text-sm">
            自动发布评论到 MR
          </Typography.Text>
          <Typography.Text type="secondary" className="text-xs">
            审查完成后自动在 GitLab MR 评论区发布审查结果
          </Typography.Text>
        </div>
        <Switch checked={autoPublish} onChange={setAutoPublish} />
      </div>

      <div className="rounded-lg border border-[#343356] bg-[#292a4a] p-4">
        <Typography.Text type="secondary" className="block text-xs">
          Token 权限要求
        </Typography.Text>
        <Typography.Paragraph type="secondary" className="mb-0 mt-2 text-xs">
          read_api 读取 MR 信息，api 发布评论到 MR。
        </Typography.Paragraph>
      </div>
    </div>
  );

  const appearanceContent = (
    <Form layout="vertical" requiredMark={false} className="pt-1">
      <Form.Item label="主题">
        <Segmented
          block
          value={themeMode}
          onChange={(value) => setThemeMode(String(value))}
          options={[
            { label: "深色", value: "dark" },
            { label: "浅色", value: "light" },
            { label: "跟随系统", value: "system" },
          ]}
        />
      </Form.Item>
    </Form>
  );

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          borderRadius: 8,
          colorBgContainer: "#292a4a",
          colorBgElevated: "#1c1c34",
          colorBorder: "#3a3a62",
          colorPrimary: "#8b67ff",
          colorText: "#f1f5f9",
          colorTextPlaceholder: "#64748b",
          colorTextSecondary: "#94a3b8",
          controlHeight: 40,
        },
        components: {
          Button: {
            defaultBg: "#303054",
            defaultBorderColor: "#303054",
            defaultColor: "#cbd5e1",
          },
          Form: {
            labelColor: "#94a3b8",
          },
          Modal: {
            contentBg: "#1c1c34",
            headerBg: "#1c1c34",
            titleColor: "#f1f5f9",
          },
          Tabs: {
            itemActiveColor: "#a989ff",
            itemColor: "#64748b",
            itemHoverColor: "#c4b5fd",
            itemSelectedColor: "#a989ff",
            inkBarColor: "#8b67ff",
          },
        },
      }}
    >
      <Modal
        centered
        closeIcon={<CloseOutlined />}
        footer={null}
        mask={{ blur: true, closable: true }}
        onCancel={onClose}
        open={open}
        title="设置"
        width={512}
        styles={{
          body: { paddingTop: 0 },
          header: {
            borderBottom: "1px solid #2c2b48",
            marginBottom: 0,
            padding: "18px 24px 14px",
          },
          mask: { backgroundColor: "rgba(0, 0, 0, 0.7)" },
        }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: "ai",
              label: (
                <Space size={6}>
                  <ApiOutlined />
                  <span>AI 配置</span>
                </Space>
              ),
              children: loading ? (
                <Typography.Text type="secondary" className="text-sm">
                  正在加载配置...
                </Typography.Text>
              ) : (
                aiConfigContent
              ),
            },
            {
              key: "gitlab",
              label: (
                <Space size={6}>
                  <GithubOutlined />
                  <span>GitLab</span>
                </Space>
              ),
              children: gitlabContent,
            },
            {
              key: "appearance",
              label: (
                <Space size={6}>
                  <BgColorsOutlined />
                  <span>外观</span>
                </Space>
              ),
              children: appearanceContent,
            },
          ]}
        />
      </Modal>
    </ConfigProvider>
  );
};

export default AiSettingsDialog;
