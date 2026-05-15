"use client";

import { LockOutlined, RobotOutlined, UserOutlined } from "@ant-design/icons";
import { Button, ConfigProvider, Form, Input, Tabs, Typography, theme } from "antd";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getAccessToken } from "@/lib/auth-token";

import {
  loginWebUser,
  registerWebUser,
  type WebLoginPayload,
  type WebRegisterPayload,
} from "@/lib/auth-api";

type LoginFormValues = WebLoginPayload;

type RegisterFormValues = WebRegisterPayload;

const LoginPage = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("login");

  useEffect(() => {
    if (getAccessToken()) {
      router.replace("/" as Route);
    }
  }, [router]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (values: LoginFormValues) => {
    setLoading(true);
    setError("");

    try {
      await loginWebUser(values);
      router.replace("/" as Route);
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (values: RegisterFormValues) => {
    if (values.password !== values.confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await registerWebUser(values);
      router.replace("/" as Route);
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "注册失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          borderRadius: 10,
          colorBgContainer: "#1c1c34",
          colorBorder: "#3a3a62",
          colorPrimary: "#8b67ff",
          colorText: "#f1f5f9",
          colorTextPlaceholder: "#64748b",
          controlHeight: 44,
        },
      }}
    >
      <main className="grid min-h-screen place-items-center bg-[#09091b] px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-[#2d2c48] bg-[#121226] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-[#34325d] bg-[#20203a] text-2xl text-[#9a72ff]">
              <RobotOutlined />
            </div>
            <Typography.Title level={3} className="!mb-1 !text-slate-100">
              AI Assistant
            </Typography.Title>
            <Typography.Text type="secondary">
              登录后使用对话与 API Key 配置
            </Typography.Text>
          </div>

          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            centered
            items={[
              {
                key: "login",
                label: "登录",
                children: (
                  <Form layout="vertical" onFinish={handleLogin} requiredMark={false}>
                    <Form.Item
                      name="username"
                      rules={[{ required: true, message: "请输入用户名" }]}
                    >
                      <Input
                        prefix={<UserOutlined />}
                        placeholder="用户名"
                        autoComplete="username"
                      />
                    </Form.Item>
                    <Form.Item
                      name="password"
                      rules={[{ required: true, message: "请输入密码" }]}
                    >
                      <Input.Password
                        prefix={<LockOutlined />}
                        placeholder="密码"
                        autoComplete="current-password"
                      />
                    </Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      block
                      loading={loading}
                    >
                      登录
                    </Button>
                  </Form>
                ),
              },
              {
                key: "register",
                label: "注册",
                children: (
                  <Form
                    layout="vertical"
                    onFinish={handleRegister}
                    requiredMark={false}
                  >
                    <Form.Item
                      name="username"
                      rules={[{ required: true, message: "请输入用户名" }]}
                    >
                      <Input prefix={<UserOutlined />} placeholder="用户名" />
                    </Form.Item>
                    <Form.Item
                      name="email"
                      rules={[
                        { required: true, message: "请输入邮箱" },
                        { type: "email", message: "邮箱格式不正确" },
                      ]}
                    >
                      <Input placeholder="邮箱" autoComplete="email" />
                    </Form.Item>
                    <Form.Item
                      name="password"
                      rules={[{ required: true, message: "请输入密码" }]}
                    >
                      <Input.Password
                        prefix={<LockOutlined />}
                        placeholder="密码"
                        autoComplete="new-password"
                      />
                    </Form.Item>
                    <Form.Item
                      name="confirmPassword"
                      rules={[{ required: true, message: "请确认密码" }]}
                    >
                      <Input.Password
                        prefix={<LockOutlined />}
                        placeholder="确认密码"
                        autoComplete="new-password"
                      />
                    </Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      block
                      loading={loading}
                    >
                      注册
                    </Button>
                  </Form>
                ),
              },
            ]}
          />

          {error && (
            <Typography.Text type="danger" className="mt-4 block text-center text-sm">
              {error}
            </Typography.Text>
          )}
        </div>
      </main>
    </ConfigProvider>
  );
};

export default LoginPage;
