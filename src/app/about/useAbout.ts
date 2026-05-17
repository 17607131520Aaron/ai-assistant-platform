import { useState, useEffect } from "react";

function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    // 处理窗口大小变化的函数
    function handleResize() {
      setWindowSize({
        width: window?.innerWidth ?? 0,
        height: window?.innerHeight ?? 0,
      });
    }

    // 立即获取当前窗口大小
    handleResize();

    // 添加事件监听器
    window.addEventListener("resize", handleResize);

    // 清理函数：移除事件监听器
    return () => window.removeEventListener("resize", handleResize);
  }, []);




  /**
   * 将扁平数组转换为树形结构
   * @param arr 扁平数组
   * @param idKey id 字段名
   * @param parentKey 父 id 字段名
   * @param childrenKey 子节点字段名
   * @returns 树形结构
   */
  const arrayToTree = <T extends Record<string, unknown>>(
    arr: T[],
    idKey = "id",
    parentKey = "parentId",
    childrenKey = "children",
  ): Array<T & Record<string, unknown[]>> => {
    const map = new Map<unknown, T & Record<string, unknown[]>>();
    const roots: Array<T & Record<string, unknown[]>> = [];

    for (const item of arr) {
      map.set(item[idKey], { ...item, [childrenKey]: [] });
    }

    for (const item of arr) {
      const node = map.get(item[idKey])!;
      const parentId = item[parentKey];

      if (parentId != null && map.has(parentId)) {
        (map.get(parentId)![childrenKey] as typeof roots).push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  };

  return {
    width: windowSize.width,
    height: windowSize.height,
    arrayToTree,
  };
}

export default useWindowSize;
