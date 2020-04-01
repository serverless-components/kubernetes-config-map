const kubernetes = require('@kubernetes/client-node')
const { Component } = require('@serverless/core')

const defaults = {
  namespace: 'default',
  data: {}
}

class KubernetesConfigMap extends Component {
  async deploy(inputs = {}) {
    const config = {
      ...defaults,
      ...inputs
    }

    const k8sCore = this.getKubernetesClient(kubernetes.CoreV1Api)

    let configMapExists = true
    try {
      await this.readConfigMap(k8sCore, config)
    } catch (error) {
      configMapExists = error.response.body.code === 404 ? false : true
    }

    if (!configMapExists) {
      await this.createConfigMap(k8sCore, config)
    }

    this.state = config
    return this.state
  }

  async remove(inputs = {}) {
    const config = {
      ...defaults,
      ...inputs,
      ...this.state
    }

    const k8sCore = this.getKubernetesClient(kubernetes.CoreV1Api)

    await this.deleteConfigMap(k8sCore, config)

    this.state = {}
    return {}
  }

  // "private" methods
  getKubernetesClient(type) {
    const { endpoint, port } = this.credentials.kubernetes
    const token = this.credentials.kubernetes.serviceAccountToken
    const skipTLSVerify = this.credentials.kubernetes.skipTlsVerify == 'true'
    const kc = new kubernetes.KubeConfig()
    kc.loadFromOptions({
      clusters: [
        {
          name: 'cluster',
          skipTLSVerify,
          server: `${endpoint}:${port}`
        }
      ],
      users: [{ name: 'user', token }],
      contexts: [
        {
          name: 'context',
          user: 'user',
          cluster: 'cluster'
        }
      ],
      currentContext: 'context'
    })
    return kc.makeApiClient(type)
  }

  async createConfigMap(k8s, { name, namespace, data }) {
    return k8s.createNamespacedConfigMap(namespace, {
      metadata: { name },
      data
    })
  }

  async readConfigMap(k8s, { name, namespace }) {
    return k8s.readNamespacedConfigMap(name, namespace)
  }

  async deleteConfigMap(k8s, { name, namespace }) {
    return k8s.deleteNamespacedConfigMap(name, namespace)
  }
}

module.exports = KubernetesConfigMap
