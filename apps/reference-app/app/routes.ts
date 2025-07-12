import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("tasks", "routes/tasks.tsx"),
  route("user", "routes/user.tsx"),
  route("auth/callback", "routes/auth.callback.tsx"),
  route("auth/login", "routes/auth.login.tsx"),
  route("admin/users", "routes/admin.users.tsx"),
] satisfies RouteConfig;
